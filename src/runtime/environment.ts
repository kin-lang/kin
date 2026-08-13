/*******************************************************************************************
 *                                      Kin's Environment                                  *
 *             In which environment are we in? variables accessible -                      *
 *    in current scope and other questions like this are solved by Kin's Environment       *
 *******************************************************************************************/

import { Interpreter } from '..';
import { Identifier, MemberExpr } from '../parser/ast';
import { createKinError } from '../lib/errors';
import {
  ArrayVal,
  BoundMethodVal,
  ClassVal,
  InstanceField,
  InstanceVal,
  MK_NATIVE_FN,
  MK_NULL,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
  resolveMethod,
  typeName,
} from './values';
import { lookupMethod } from './methods';

/**
 * Active method / constructor frame. Used to enforce bwite visibility and
 * to allow field init only inside tegura.
 */
export interface MethodContext {
  declaringClass: ClassVal;
  instance: InstanceVal;
  isConstructor: boolean;
}

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeVal>;
  private constants: Set<string>;
  /** Set on scopes created for tegura / method bodies. */
  public methodContext?: MethodContext;

  constructor(parentENV?: Environment) {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
  }

  /** Nearest method/constructor context walking parents. */
  public getMethodContext(): MethodContext | undefined {
    if (this.methodContext) return this.methodContext;
    return this.parent?.getMethodContext();
  }

  public declareVar(
    varname: string,
    value: RuntimeVal,
    constant: boolean,
  ): RuntimeVal {
    if (this.variables.has(varname)) {
      throw createKinError('K007', {
        params: { name: varname },
        message: `Cannot declare variable ${varname}. As it already is defined.`,
      });
    }

    this.variables.set(varname, value);

    if (constant) this.constants.add(varname);

    return value;
  }

  public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
    const env = this.resolve(varname);

    if (env.constants.has(varname)) {
      throw createKinError('K006', {
        params: { name: varname },
        message: `Cannot reassign to variable "${varname}" as it's constant.`,
      });
    }

    env.variables.set(varname, value);

    return value;
  }

  public lookupMember(expr: MemberExpr): RuntimeVal {
    const { container, key, isArray, isInstance } =
      this.resolveMemberTarget(expr);

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

    if (isInstance) {
      return this.lookupInstanceMember(container as InstanceVal, key, expr);
    }

    const obj = container as ObjectVal;
    return obj.properties.get(key) ?? MK_NULL();
  }

  public assignMember(expr: MemberExpr, value: RuntimeVal): RuntimeVal {
    const { container, key, isArray, isInstance } =
      this.resolveMemberTarget(expr);

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

    if (isInstance) {
      return this.assignInstanceMember(
        container as InstanceVal,
        key,
        value,
        expr,
      );
    }

    const obj = container as ObjectVal;
    obj.properties.set(key, value);
    return value;
  }

  private canAccessPrivate(owner: ClassVal): boolean {
    const ctx = this.getMethodContext();
    return ctx !== undefined && ctx.declaringClass === owner;
  }

  private lookupInstanceMember(
    instance: InstanceVal,
    key: string,
    expr: MemberExpr,
  ): RuntimeVal {
    const field = instance.fields.get(key);
    if (field) {
      if (
        field.visibility === 'bwite' &&
        !this.canAccessPrivate(field.owner)
      ) {
        throw createKinError('K036', {
          span: expr.span,
          params: { name: key },
          message: `Cannot access private field '${key}'`,
        });
      }
      return field.value;
    }

    const method = resolveMethod(instance.classOf, key);
    if (method) {
      if (
        method.visibility === 'bwite' &&
        !this.canAccessPrivate(method.declaringClass)
      ) {
        throw createKinError('K036', {
          span: expr.span,
          params: { name: key },
          message: `Cannot access private method '${key}'`,
        });
      }
      return {
        type: 'bound-method',
        instance,
        method,
      } as BoundMethodVal;
    }

    return MK_NULL();
  }

  private assignInstanceMember(
    instance: InstanceVal,
    key: string,
    value: RuntimeVal,
    expr: MemberExpr,
  ): RuntimeVal {
    const field = instance.fields.get(key);
    if (!field) {
      throw createKinError('K037', {
        span: expr.span,
        params: { name: key },
        message: `Cannot assign to unknown field '${key}' (fields are created only in tegura)`,
      });
    }
    if (field.visibility === 'bwite' && !this.canAccessPrivate(field.owner)) {
      throw createKinError('K036', {
        span: expr.span,
        params: { name: key },
        message: `Cannot access private field '${key}'`,
      });
    }
    field.value = value;
    return value;
  }

  /**
   * Create a field on the current instance from inside tegura.
   * Visibility is fixed at creation time.
   */
  public initInstanceField(
    name: string,
    visibility: 'rusange' | 'bwite',
    value: RuntimeVal,
    span?: import('../lib/span').Span,
  ): RuntimeVal {
    const ctx = this.getMethodContext();
    if (!ctx || !ctx.isConstructor) {
      throw createKinError('K032', {
        span,
        params: { name: visibility },
        message: 'Field init with visibility is only allowed inside tegura',
      });
    }
    const existing = ctx.instance.fields.get(name);
    if (existing) {
      // Re-init in the same constructor overwrites value but keeps owner.
      existing.value = value;
      existing.visibility = visibility;
      existing.owner = ctx.declaringClass;
      return value;
    }
    const field: InstanceField = {
      value,
      visibility,
      owner: ctx.declaringClass,
    };
    ctx.instance.fields.set(name, field);
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
    container: ObjectVal | ArrayVal | InstanceVal;
    key: string;
    isArray: boolean;
    isInstance: boolean;
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
      return {
        container: obj as ArrayVal,
        key,
        isArray: true,
        isInstance: false,
      };
    }

    if (obj && obj.type === 'instance') {
      return {
        container: obj as InstanceVal,
        key,
        isArray: false,
        isInstance: true,
      };
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
        return {
          container: fake,
          key,
          isArray: false,
          isInstance: false,
        };
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

    return {
      container: obj as ObjectVal,
      key,
      isArray: false,
      isInstance: false,
    };
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
