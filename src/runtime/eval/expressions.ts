/***********************************************************************
 *                        Expressions Evaluation                        *
 *             Responsible of Kin's Expressions Evaluation              *
 ***********************************************************************/

import {
  BooleanVal,
  FunctionValue,
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
  NativeFnValue,
  NullVal,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from '../values';
import {
  Identifier,
  AssignmentExpr,
  ObjectLiteral,
  MemberExpr,
  BinaryExpr,
  CallExpr,
  UnaryExpr,
  ReturnExpr,
} from '../../parser/ast';

import Environment from '../environment';
import { Interpreter } from '../interpreter';
import { LogError } from '../../lib/log';

export default class EvalExpr {
  private static functionReturned = false; // flag to check if function returned
  private static functionReturnValue: RuntimeVal = MK_NULL(); // value to return from function

  public static eval_identifier(
    ident: Identifier,
    env: Environment,
  ): RuntimeVal {
    const val = env.lookupVar(ident.symbol);
    return val;
  }

  public static eval_binary_expr(
    node: BinaryExpr,
    env: Environment,
  ): RuntimeVal {
    const lhs = Interpreter.evaluate(node.left, env);
    const rhs = Interpreter.evaluate(node.right, env);
    return this.eval_numeric_binary_expr(
      lhs as RuntimeVal,
      rhs as RuntimeVal,
      node.operator,
    );
  }

  public static eval_unary_expr(node: UnaryExpr, env: Environment): RuntimeVal {
    const ident: RuntimeVal = env.lookupVar(node.variable);
    let value;
    switch (node.operator) {
      case '!':
        value = MK_BOOL(!(ident as BooleanVal).value);
        break;
      default:
        LogError(
          'Unsupported unary operator ',
          node.operator,
          ' report this issue to our developers',
        );
    }
    return value as RuntimeVal;
  }

  public static eval_assignment(
    node: AssignmentExpr,
    env: Environment,
  ): RuntimeVal {
    if (node.assigne.kind === 'MemberExpression')
      return this.eval_member_expr(env, node);
    if (node.assigne.kind !== 'Identifier')
      throw new Error(
        `Invalid left-hand-side expression: ${JSON.stringify(node.assigne)}.`,
      );

    const varname = (node.assigne as Identifier).symbol;

    return env.assignVar(varname, Interpreter.evaluate(node.value, env));
  }

  public static eval_object_expr(
    obj: ObjectLiteral,
    env: Environment,
  ): RuntimeVal {
    const object = { type: 'object', properties: new Map() } as ObjectVal;

    for (const { key, value } of obj.properties) {
      const runtimeVal =
        value == undefined
          ? env.lookupVar(key)
          : Interpreter.evaluate(value, env);

      object.properties.set(key, runtimeVal);
    }

    return object;
  }

  public static eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
    const args = expr.args.map((arg) => Interpreter.evaluate(arg, env));
    const fn = Interpreter.evaluate(expr.caller, env);

    if (fn.type == 'native-fn') {
      const result = (fn as NativeFnValue).call(args, env);

      return result;
    }

    if (fn.type == 'fn') {
      const func = fn as FunctionValue;
      const scope = new Environment(func.declarationEnv);

      if (args.length != func.parameters.length) {
        LogError(
          "Kin Error: number of function's arguments must equal to it's the parameters",
        );
      }

      // Create the variables for the parameters list
      for (let i = 0; i < func.parameters.length; i++) {
        // verify arity of function
        const varname = func.parameters[i];
        scope.declareVar(varname, args[i], false);
      }

      // Evaluate the function body line by line
      for (const stmt of func.body) {
        // stop when return statement is reached
        if (this.functionReturned) {
          this.functionReturned = false;

          return this.functionReturnValue;
        }

        if (stmt.kind === 'FunctionTerminator') break;

        Interpreter.evaluate(stmt, scope);
      }

      // We only reach here when the function did not return hence return null
      const result: RuntimeVal = MK_NULL();

      return result;
    }

    throw new Error(
      'Cannot call value that is not a function: ' + JSON.stringify(fn),
    );
  }

  public static eval_return_expr(
    expr: ReturnExpr,
    env: Environment,
  ): RuntimeVal {
    const value = expr.value
      ? Interpreter.evaluate(expr.value, env)
      : MK_NULL();

    this.functionReturned = true;
    this.functionReturnValue = value;
    return value;
  }

  public static eval_member_expr(
    env: Environment,
    node?: AssignmentExpr,
    expr?: MemberExpr,
  ): RuntimeVal {
    if (expr) {
      const variable = env.lookupOrMutObject(expr);
      return variable;
    } else if (node) {
      const variable = env.lookupOrMutObject(
        node.assigne as MemberExpr,
        Interpreter.evaluate(node.value, env),
      );

      return variable;
    } else {
      throw new Error(
        `Evaluating a member expression is not possible without a member or assignment expression.`,
      );
    }
  }

  private static eval_numeric_binary_expr(
    lhs: RuntimeVal,
    rhs: RuntimeVal,
    operator: string,
  ): RuntimeVal {
    if (operator === '!=') {
      return this.equals(lhs, rhs, false);
    } else if (operator === '==') {
      return this.equals(lhs, rhs, true);
    } else if (operator === '&&') {
      const llhs = lhs as BooleanVal;
      const rrhs = rhs as BooleanVal;

      return MK_BOOL(llhs.value && rrhs.value);
    } else if (operator === '||') {
      const llhs = lhs as BooleanVal;
      const rrhs = rhs as BooleanVal;

      return MK_BOOL(llhs.value || rrhs.value);
    } else if (lhs.type === 'number' && rhs.type === 'number') {
      const llhs = lhs as NumberVal;
      const rrhs = rhs as NumberVal;

      switch (operator) {
        case '+':
          return MK_NUMBER(llhs.value + rrhs.value);
        case '-':
          return MK_NUMBER(llhs.value - rrhs.value);
        case '*':
          return MK_NUMBER(llhs.value * rrhs.value);
        case '/':
          return MK_NUMBER(llhs.value / rrhs.value);
        case '^':
          return MK_NUMBER(llhs.value ** rrhs.value);
        case '%':
          return MK_NUMBER(llhs.value % rrhs.value);
        case '<':
          return MK_BOOL(llhs.value < rrhs.value);
        case '>':
          return MK_BOOL(llhs.value > rrhs.value);
        case '<=':
          return MK_BOOL(llhs.value <= rrhs.value);
        case '>=':
          return MK_BOOL(llhs.value >= rrhs.value);
        default:
          throw new Error(
            `Unknown operator provided in operation: ${lhs}, ${rhs}.`,
          );
      }
    } else {
      return MK_NULL();
    }
  }

  private static equals(
    lhs: RuntimeVal,
    rhs: RuntimeVal,
    strict: boolean,
  ): RuntimeVal {
    const compare = strict
      ? (a: unknown, b: unknown) => a === b
      : (a: unknown, b: unknown) => a !== b;

    switch (lhs.type) {
      case 'boolean':
        return MK_BOOL(
          compare((lhs as BooleanVal).value, (rhs as BooleanVal).value),
        );
      case 'number':
        return MK_BOOL(
          compare((lhs as NumberVal).value, (rhs as NumberVal).value),
        );
      case 'string':
        return MK_BOOL(
          compare((lhs as StringVal).value, (rhs as StringVal).value),
        );
      case 'fn':
        return MK_BOOL(
          compare((lhs as FunctionValue).body, (rhs as FunctionValue).body),
        );
      case 'native-fn':
        return MK_BOOL(
          compare((lhs as NativeFnValue).call, (rhs as NativeFnValue).call),
        );
      case 'null':
        return MK_BOOL(compare((lhs as NullVal).value, (rhs as NullVal).value));
      case 'object':
        return MK_BOOL(
          compare((lhs as ObjectVal).properties, (rhs as ObjectVal).properties),
        );
      default:
        throw new Error(
          `RunTime: Unhandled type in equals function: ${lhs}, ${rhs}`,
        );
    }
  }
}
