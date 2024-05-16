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
    property?: Identifier,
  ): RuntimeVal {
    if (expr.object.kind == 'MemberExpression') {
      let variable = this.lookupOrMutObject(
        expr.object as MemberExpr,
        value,
        expr.property as Identifier,
      );

      // For nested properties
      if (expr.property && variable.type == 'object') {
        const computed_property =
          (expr.property as Identifier).symbol ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (expr.property as any)?.value.toString();
        variable = (variable as ObjectVal).properties.get(
          computed_property,
        ) as RuntimeVal;
      }

      return variable;
    }

    const varname = (expr.object as Identifier).symbol;
    const env = this.resolve(varname);

    let pastVal = env.variables.get(varname) as ObjectVal;

    const prop = (
      property
        ? property.symbol
        : !expr.computed
          ? (expr.property as Identifier).symbol
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Interpreter.evaluate(expr.property, env) as StringVal | NumberVal)
              .value
    ).toString();

    const currentProp = (
      expr.property.kind == 'Identifier'
        ? expr.computed
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Interpreter.evaluate(expr.property, env) as any).value
          : (expr.property as Identifier).symbol
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Interpreter.evaluate(expr.property, env) as StringVal | NumberVal)
            .value
    ).toString();

    if (value) pastVal.properties.set(prop, value);

    if (currentProp) pastVal = pastVal.properties.get(currentProp) as ObjectVal;

    return pastVal;
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
