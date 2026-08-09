/*******************************************************************************************
 *                                      Kin's Environment                                  *
 *             In which environment are we in? variables accessible -                      *
 *    in current scope and other questions like this are solved by Kin's Environment       *
 *******************************************************************************************/

import { Interpreter } from '..';
import { Identifier, MemberExpr } from '../parser/ast';
import { NumberVal, ObjectVal, RuntimeVal, StringVal } from './values';

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
      throw new Error(
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
      throw new Error(
        `Cannot reassign to variable "${varname}" as it's constant.`,
      );
    }

    env.variables.set(varname, value);

    return value;
  }

  public lookupOrMutObject(
    expr: MemberExpr,
    value?: RuntimeVal,
    env?: Environment,
  ): RuntimeVal {
    // Evaluate computed indexes in the environment where the access happens
    // (not where the object is declared), so loop/function-local variables work.
    const currentEnv = env ?? this;

    // A nested member expression (e.g. `arr[0][1]` or `obj.a.b`): resolve the
    // object side first, then read or write the property on the resolved value.
    if (expr.object.kind == 'MemberExpression') {
      const obj = this.lookupOrMutObject(
        expr.object as MemberExpr,
        undefined,
        currentEnv,
      );

      const key = this.resolveMemberKey(expr, currentEnv);

      if (value !== undefined) {
        (obj as ObjectVal).properties.set(key, value);
        return value;
      }

      return (obj as ObjectVal).properties.get(key) as RuntimeVal;
    }

    // Base case: expr.object is an identifier that holds the object/array.
    const varname = (expr.object as Identifier).symbol;
    const ownerEnv = this.resolve(varname);

    const obj = ownerEnv.variables.get(varname) as ObjectVal;
    const key = this.resolveMemberKey(expr, currentEnv);

    if (value !== undefined) {
      obj.properties.set(key, value);
      return value;
    }

    return obj.properties.get(key) as RuntimeVal;
  }

  private resolveMemberKey(expr: MemberExpr, env: Environment): string {
    // Dot access (obj.member): the property is an identifier.
    if (!expr.computed) return (expr.property as Identifier).symbol;

    // Bracket access (obj[expr]): the property is an expression to evaluate.
    const evaluated = Interpreter.evaluate(expr.property, env) as
      StringVal | NumberVal;

    return evaluated.value.toString();
  }

  public lookupVar(varname: string): RuntimeVal {
    const env = this.resolve(varname);

    return env.variables.get(varname) as RuntimeVal;
  }

  public resolve(varname: string): Environment {
    if (this.variables.has(varname)) return this;

    if (this.parent == undefined)
      throw new Error(`Cannot resolve '${varname}' as it does not exist.`);

    return this.parent.resolve(varname);
  }
}
