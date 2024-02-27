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
} from '../../parser/ast';

import Environment from '../environment';
import { Interpreter } from '../interpreter';

export default class EvalExpr {
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

  public static eval_assignment(
    node: AssignmentExpr,
    env: Environment,
  ): RuntimeVal {
    if (node.assigne.kind === 'MemberExpression')
      return this.eval_member_expr(env, node);
    if (node.assigne.kind !== 'Identifier')
      throw `Invalid left-hand-side expression: ${JSON.stringify(node.assigne)}.`;

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

      // Create the variables for the parameters list
      for (let i = 0; i < func.parameters.length; i++) {
        // TODO check the bounds here
        // verify arity of function
        const varname = func.parameters[i];
        scope.declareVar(varname, args[i], false);
      }

      // Evaluate the function body line by line
      for (const stmt of func.body) {
        // manage return stmt
        if (stmt.kind == 'ReturnExpr') {
          const has_return_value =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (stmt as any).value != undefined ? true : false;
          return has_return_value
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Interpreter.evaluate((stmt as any).value, scope)
            : MK_NULL();
        }
        Interpreter.evaluate(stmt, scope);
      }

      const result: RuntimeVal = MK_NULL();

      return result;
    }

    throw 'Cannot call value that is not a function: ' + JSON.stringify(fn);
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
      throw `Evaluating a member expression is not possible without a member or assignment expression.`;
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
          throw `Unknown operator provided in operation: ${lhs}, ${rhs}.`;
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
        throw `RunTime: Unhandled type in equals function: ${lhs}, ${rhs}`;
    }
  }
}
