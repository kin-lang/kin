/*******************************************************************************************
 *                                      Kin's Environment                                  *
 *             In which environment are we in? variables accessible -                      *
 *    in current scope and other questions like this are solved by Kin's Environment       *
 *******************************************************************************************/

import { Interpreter } from '..';
import { Identifier, MemberExpr, TypeAnnotation } from '../parser/ast';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';
import {
  ArrayVal,
  MK_NATIVE_FN,
  MK_NULL,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
  typeName,
} from './values';
import { lookupMethod } from './methods';
import {
  assertValueMatchesType,
  TypeSafetyMode,
} from './types';

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeVal>;
  private constants: Set<string>;
  /** Type annotations for variables declared with `: type` / `: type?`. */
  private types: Map<string, TypeAnnotation>;
  /**
   * Type-safety mode for this program. Nested scopes **copy** the parent's
   * mode at construction time (not a live root lookup).
   */
  private typeSafety: TypeSafetyMode;

  constructor(parentENV?: Environment, typeSafety: TypeSafetyMode = 'on') {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
    this.types = new Map();
    this.typeSafety = parentENV ? parentENV.typeSafety : typeSafety;
  }

  public getTypeSafety(): TypeSafetyMode {
    return this.typeSafety;
  }

  /**
   * Update type-safety mode (e.g. REPL after a `# kin-types:` line).
   * Nested scopes created later inherit via the constructor copy.
   */
  public setTypeSafety(mode: TypeSafetyMode): void {
    this.typeSafety = mode;
  }

  public declareVar(
    varname: string,
    value: RuntimeVal,
    constant: boolean,
    typeAnnotation?: TypeAnnotation,
    span?: Span,
  ): RuntimeVal {
    if (this.variables.has(varname)) {
      throw createKinError('K007', {
        params: { name: varname },
        message: `Cannot declare variable ${varname}. As it already is defined.`,
      });
    }

    // `off` ignores annotations; `on`/`strict` check and store them.
    if (typeAnnotation && this.typeSafety !== 'off') {
      assertValueMatchesType(value, typeAnnotation, varname, span);
      this.types.set(varname, typeAnnotation);
    }

    this.variables.set(varname, value);

    if (constant) this.constants.add(varname);

    return value;
  }

  public assignVar(
    varname: string,
    value: RuntimeVal,
    span?: Span,
  ): RuntimeVal {
    const env = this.resolve(varname);

    if (env.constants.has(varname)) {
      throw createKinError('K006', {
        params: { name: varname },
        message: `Cannot reassign to variable "${varname}" as it's constant.`,
      });
    }

    if (this.typeSafety !== 'off') {
      const annotation = env.types.get(varname);
      if (annotation) {
        assertValueMatchesType(value, annotation, varname, span);
      }
    }

    env.variables.set(varname, value);

    return value;
  }

  /** Look up a variable's type annotation, if any (for hosts / tests). */
  public lookupType(varname: string): TypeAnnotation | undefined {
    return this.resolve(varname).types.get(varname);
  }

  public lookupMember(expr: MemberExpr): RuntimeVal {
    const { container, key, isArray } = this.resolveMemberTarget(expr);

    if (isArray) {
      const arr = container as ArrayVal;
      // Method name via dot: arr.ingano -> native method wrapper is handled
      // by eval_member_expr when the next node is a call. For bare property
      // read of a method name we return a bound-style native later; for
      // numeric index we index the array.
      if (!expr.computed) {
        // Dot access on array: only methods make sense; missing -> null.
        const method = lookupMethod(arr, key);
        if (method) {
          return MK_NATIVE_FN((args) => method(arr, args, expr.span));
        }
        return MK_NULL();
      }
      const index = Number(key);
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= arr.elements.length
      ) {
        throw createKinError('K016', {
          span: expr.span,
          params: { index: key, length: arr.elements.length },
          message: `Array index ${key} is out of range (length ${arr.elements.length})`,
        });
      }
      return arr.elements[index];
    }

    const obj = container as ObjectVal;
    return obj.properties.get(key) ?? MK_NULL();
  }

  public assignMember(expr: MemberExpr, value: RuntimeVal): RuntimeVal {
    const { container, key, isArray } = this.resolveMemberTarget(expr);

    if (isArray) {
      const arr = container as ArrayVal;
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        throw createKinError('K016', {
          span: expr.span,
          params: { index: key, length: arr.elements.length },
          message: `Array index ${key} is out of range (length ${arr.elements.length})`,
        });
      }
      // Allow extending by exactly one past the end (like push via index).
      if (index > arr.elements.length) {
        throw createKinError('K016', {
          span: expr.span,
          params: { index: key, length: arr.elements.length },
          message: `Array index ${key} is out of range (length ${arr.elements.length})`,
        });
      }
      if (index === arr.elements.length) {
        arr.elements.push(value);
      } else {
        arr.elements[index] = value;
      }
      return value;
    }

    const obj = container as ObjectVal;
    obj.properties.set(key, value);
    return value;
  }

  /** Reads a member expression; writes via assignMember. Kept for backward
   *  compatibility with the published @kin-lang/kin API. */
  public lookupOrMutObject(expr: MemberExpr, value?: RuntimeVal): RuntimeVal {
    return value === undefined
      ? this.lookupMember(expr)
      : this.assignMember(expr, value);
  }

  /**
   * Walks a member expression (e.g. `arr[0][1]` or `obj.a.b.c`) down to the
   * container the leaf property belongs to.
   */
  private resolveMemberTarget(expr: MemberExpr): {
    container: ObjectVal | ArrayVal;
    key: string;
    isArray: boolean;
  } {
    let obj: RuntimeVal;

    if (expr.object.kind === 'MemberExpression') {
      obj = this.lookupMember(expr.object as MemberExpr);
    } else if (expr.object.kind === 'Identifier') {
      const varname = (expr.object as Identifier).symbol;
      obj = this.resolve(varname).variables.get(varname) as RuntimeVal;
    } else {
      obj = Interpreter.evaluate(expr.object, this);
    }

    const key = this.resolveMemberKey(expr);

    // Method lookup on string / array is handled for computed=false by
    // returning a bound native; still need a container for indexing.
    if (obj && obj.type === 'array') {
      return { container: obj as ArrayVal, key, isArray: true };
    }

    if (obj && obj.type === 'string' && !expr.computed) {
      // String methods: return a synthetic object path via lookupMember.
      // Handled specially: treat as array-like method table.
      const method = lookupMethod(obj, key);
      if (method) {
        // Surface the method via a temporary object so lookupMember works.
        const fake: ObjectVal = {
          type: 'object',
          properties: new Map([
            [key, MK_NATIVE_FN((args) => method(obj, args, expr.span))],
          ]),
        };
        return { container: fake, key, isArray: false };
      }
    }

    if (obj === undefined || obj.type !== 'object') {
      const type =
        obj === undefined || obj.type === 'null' ? 'ubusa' : typeName(obj);

      throw createKinError('K008', {
        span: expr.span,
        params: { key, type },
        message: `Cannot access property '${key}' of ${type}`,
      });
    }

    return { container: obj as ObjectVal, key, isArray: false };
  }

  private resolveMemberKey(expr: MemberExpr): string {
    if (!expr.computed) return (expr.property as Identifier).symbol;

    const evaluated = Interpreter.evaluate(expr.property, this);

    if (evaluated.type !== 'string' && evaluated.type !== 'number') {
      throw createKinError('K009', {
        span: expr.property.span,
        params: { type: typeName(evaluated) },
        message: `Cannot use ${evaluated.type} as an index/key`,
      });
    }

    return (evaluated as StringVal | NumberVal).value.toString();
  }

  public lookupVar(varname: string): RuntimeVal {
    const env = this.resolve(varname);
    return env.variables.get(varname) as RuntimeVal;
  }

  public resolve(varname: string): Environment {
    if (this.variables.has(varname)) return this;

    if (this.parent == undefined) {
      throw createKinError('K005', {
        params: { name: varname },
        message: `Cannot resolve '${varname}' as it does not exist.`,
      });
    }

    return this.parent.resolve(varname);
  }
}
