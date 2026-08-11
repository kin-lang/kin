/*******************************************************************************************
 *                                      Kin's Environment                                  *
 *             In which environment are we in? variables accessible -                      *
 *    in current scope and other questions like this are solved by Kin's Environment       *
 *******************************************************************************************/

import { Interpreter } from '..';
import { Identifier, MemberExpr } from '../parser/ast';
import {
  KinReferenceError,
  KinRuntimeError,
  KinTypeError,
} from '../lib/errors';
import { MK_NULL, NumberVal, ObjectVal, RuntimeVal, StringVal } from './values';

export default class Environment {
  private parent?: Environment;
  private variables: Map<string, RuntimeVal>;
  private constants: Set<string>;

  constructor(parentENV?: Environment) {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
  }

  public declareVar(
    varname: string,
    value: RuntimeVal,
    constant: boolean,
  ): RuntimeVal {
    if (this.variables.has(varname)) {
      throw new KinRuntimeError(
        `Cannot declare variable ${varname}. As it already is defined.`,
      );
    }

    this.variables.set(varname, value);

    if (constant) this.constants.add(varname);

    return value;
  }

  public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
    const env = this.resolve(varname);

    // Cannot assign to constant
    if (env.constants.has(varname)) {
      throw new KinRuntimeError(
        `Cannot reassign to variable "${varname}" as it's constant.`,
      );
    }

    env.variables.set(varname, value);

    return value;
  }

  public lookupMember(expr: MemberExpr): RuntimeVal {
    const { obj, key } = this.resolveMemberTarget(expr);

    return obj.properties.get(key) ?? MK_NULL();
  }

  public assignMember(expr: MemberExpr, value: RuntimeVal): RuntimeVal {
    const { obj, key } = this.resolveMemberTarget(expr);

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
   * object/array the leaf property belongs to, resolving every computed index
   * in the current scope. Throws a Kin error when the target is not an object.
   */
  private resolveMemberTarget(expr: MemberExpr): {
    obj: ObjectVal;
    key: string;
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

    if (obj === undefined || obj.type !== 'object') {
      const type =
        obj === undefined || obj.type === 'null' ? 'ubusa' : obj.type;

      throw new KinTypeError(`Cannot access property '${key}' of ${type}`);
    }

    return { obj: obj as ObjectVal, key };
  }

  private resolveMemberKey(expr: MemberExpr): string {
    // Dot access (obj.member): the property is an identifier.
    if (!expr.computed) return (expr.property as Identifier).symbol;

    // Bracket access (obj[expr]): the property is an expression to evaluate.
    const evaluated = Interpreter.evaluate(expr.property, this);

    if (evaluated.type !== 'string' && evaluated.type !== 'number') {
      throw new KinTypeError(`Cannot use ${evaluated.type} as an index/key`);
    }

    return (evaluated as StringVal | NumberVal).value.toString();
  }

  public lookupVar(varname: string): RuntimeVal {
    const env = this.resolve(varname);

    return env.variables.get(varname) as RuntimeVal;
  }

  public resolve(varname: string): Environment {
    if (this.variables.has(varname)) return this;

    if (this.parent == undefined)
      throw new KinReferenceError(
        `Cannot resolve '${varname}' as it does not exist.`,
      );

    return this.parent.resolve(varname);
  }
}
