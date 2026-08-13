/*******************************************************************************************
 *                                      Kin's Environment                                  *
 *             In which environment are we in? variables accessible -                      *
 *    in current scope and other questions like this are solved by Kin's Environment       *
 *******************************************************************************************/

import { Identifier, MemberExpr } from '../parser/ast';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';
import { Interpreter } from './interpreter';
import {
  ArrayVal,
  BoundMethodVal,
  ClassMethodDef,
  ClassVal,
  InstanceVal,
  MK_NATIVE_FN,
  MK_NULL,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
  typeName,
} from './values';
import { lookupMethod as lookupBuiltinMethod } from './methods';
import {
  assertValueMatchesType,
  ResolvedType,
} from './types';

/**
 * Active method / constructor frame. Stored on Interpreter's call stack
 * (not Environment), so freestanding callbacks cannot retain private access.
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
  /** Declared type for annotated bindings (checked on assign). */
  private variableTypes: Map<string, ResolvedType>;
  /** Named type aliases registered in this scope. */
  private typeAliases: Map<string, ResolvedType>;

  constructor(parentENV?: Environment) {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
    this.variableTypes = new Map();
    this.typeAliases = new Map();
  }

  public getMethodContext(): MethodContext | undefined {
    return Interpreter.getMethodContext();
  }

  public declareVar(
    varname: string,
    value: RuntimeVal,
    constant: boolean,
    type?: ResolvedType,
    span?: Span,
  ): RuntimeVal {
    if (this.variables.has(varname)) {
      throw createKinError('K007', {
        params: { name: varname },
        message: `Cannot declare variable ${varname}. As it already is defined.`,
      });
    }

    if (type) {
      assertValueMatchesType(value, type, span);
      this.variableTypes.set(varname, type);
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

    const declaredType = env.variableTypes.get(varname);
    if (declaredType) {
      assertValueMatchesType(value, declaredType, span);
    }

    env.variables.set(varname, value);

    return value;
  }

  /** Look up the declared type of a binding, if any. */
  public lookupVarType(varname: string): ResolvedType | undefined {
    const env = this.resolve(varname);
    return env.variableTypes.get(varname);
  }

  public declareType(name: string, type: ResolvedType): void {
    if (this.typeAliases.has(name)) {
      throw createKinError('K036', {
        params: { name },
        message: `Type '${name}' is already defined`,
      });
    }
    this.typeAliases.set(name, type);
  }

  public lookupType(name: string): ResolvedType | undefined {
    if (this.typeAliases.has(name)) {
      return this.typeAliases.get(name);
    }
    if (this.parent) return this.parent.lookupType(name);
    return undefined;
  }

  /**
   * Resolve a class type by name from values (imiterere bindings).
   * Used so `reka x: Umuntu = …` can check instance class.
   */
  public lookupClass(name: string): ClassVal | undefined {
    try {
      const v = this.lookupVar(name);
      if (v.type === 'class') return v as ClassVal;
    } catch {
      // not found
    }
    return undefined;
  }

  public lookupMember(expr: MemberExpr): RuntimeVal {
    const { container, key, kind } = this.resolveMemberTarget(expr);

    if (kind === 'array') {
      const arr = container as ArrayVal;
      if (!expr.computed) {
        const method = lookupBuiltinMethod(arr, key);
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

    if (kind === 'instance') {
      return this.lookupInstanceMember(container as InstanceVal, key, expr);
    }

    const obj = container as ObjectVal;
    return obj.properties.get(key) ?? MK_NULL();
  }

  public assignMember(expr: MemberExpr, value: RuntimeVal): RuntimeVal {
    const { container, key, kind } = this.resolveMemberTarget(expr);

    if (kind === 'array') {
      const arr = container as ArrayVal;
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        throw createKinError('K016', {
          span: expr.span,
          params: { index: key, length: arr.elements.length },
          message: `Array index ${key} is out of range (length ${arr.elements.length})`,
        });
      }
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

    if (kind === 'instance') {
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

  /** Reads a member expression; writes via assignMember. Kept for backward
   *  compatibility with the published @kin-lang/kin API. */
  public lookupOrMutObject(expr: MemberExpr, value?: RuntimeVal): RuntimeVal {
    return value === undefined
      ? this.lookupMember(expr)
      : this.assignMember(expr, value);
  }

  private lookupInstanceMember(
    inst: InstanceVal,
    key: string,
    expr: MemberExpr,
  ): RuntimeVal {
    // Methods shadow fields of the same name.
    const method = findMethod(inst.klass, key);
    if (method) {
      this.assertMethodAccess(method, expr.span);
      return {
        type: 'bound-method',
        receiver: inst,
        method,
      } as BoundMethodVal;
    }

    if (inst.fields.has(key)) {
      this.assertFieldAccess(inst, key, expr.span);
      return inst.fields.get(key)!;
    }

    return MK_NULL();
  }

  private assignInstanceMember(
    inst: InstanceVal,
    key: string,
    value: RuntimeVal,
    expr: MemberExpr,
  ): RuntimeVal {
    // Cannot assign to methods.
    if (findMethod(inst.klass, key)) {
      throw createKinError('K039', {
        span: expr.span,
        params: { name: key },
        message: `Cannot assign to method '${key}'`,
      });
    }

    if (!inst.fields.has(key)) {
      throw createKinError('K040', {
        span: expr.span,
        params: { name: key, klass: inst.klass.name },
        message: `Field '${key}' does not exist on ${inst.klass.name}; fields are created only in tegura`,
      });
    }

    this.assertFieldAccess(inst, key, expr.span);
    inst.fields.set(key, value);
    return value;
  }

  private canAccessPrivate(owner: ClassVal): boolean {
    const ctx = this.getMethodContext();
    return ctx !== undefined && ctx.declaringClass === owner;
  }

  private assertFieldAccess(
    inst: InstanceVal,
    key: string,
    span?: Span,
  ): void {
    const vis = inst.fieldVisibility.get(key);
    if (vis !== 'bwite') return;
    const owner = inst.fieldOwner.get(key);
    if (!owner || !this.canAccessPrivate(owner)) {
      throw createKinError('K041', {
        span,
        params: { name: key },
        message: `Cannot access private field '${key}'`,
      });
    }
  }

  private assertMethodAccess(method: ClassMethodDef, span?: Span): void {
    if (method.visibility !== 'bwite') return;
    if (!this.canAccessPrivate(method.ownerClass)) {
      throw createKinError('K041', {
        span,
        params: { name: method.name },
        message: `Cannot access private method '${method.name}'`,
      });
    }
  }

  /**
   * Walks a member expression (e.g. `arr[0][1]` or `obj.a.b.c`) down to the
   * container the leaf property belongs to.
   */
  private resolveMemberTarget(expr: MemberExpr): {
    container: ObjectVal | ArrayVal | InstanceVal;
    key: string;
    kind: 'object' | 'array' | 'instance';
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

    if (obj && obj.type === 'array') {
      return { container: obj as ArrayVal, key, kind: 'array' };
    }

    if (obj && obj.type === 'instance') {
      return { container: obj as InstanceVal, key, kind: 'instance' };
    }

    if (obj && obj.type === 'string' && !expr.computed) {
      const method = lookupBuiltinMethod(obj, key);
      if (method) {
        const fake: ObjectVal = {
          type: 'object',
          properties: new Map([
            [key, MK_NATIVE_FN((args) => method(obj, args, expr.span))],
          ]),
        };
        return { container: fake, key, kind: 'object' };
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

    return { container: obj as ObjectVal, key, kind: 'object' };
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

  /** Root environment of this chain (shared builtins / module cache key). */
  public getRoot(): Environment {
    return this.parent ? this.parent.getRoot() : this;
  }
}

/** Method lookup: own class first, then walk parents. */
export function findMethod(
  klass: ClassVal,
  name: string,
): ClassMethodDef | undefined {
  if (klass.methods.has(name)) return klass.methods.get(name);
  if (klass.parent) return findMethod(klass.parent, name);
  return undefined;
}

/** Resolve constructor: own tegura, else inherited, else empty. */
export function findConstructor(klass: ClassVal): {
  params: string[];
  paramTypes?: (import('./types').ResolvedType | undefined)[];
  body: import('../parser/ast').Stmt[];
  owner: ClassVal;
} {
  if (klass.hasConstructor) {
    return {
      params: klass.constructorParams,
      paramTypes: klass.constructorParamTypes,
      body: klass.constructorBody,
      owner: klass,
    };
  }
  if (klass.parent) return findConstructor(klass.parent);
  return { params: [], body: [], owner: klass };
}
