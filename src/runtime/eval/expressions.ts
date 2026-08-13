/***********************************************************************
 *                        Expressions Evaluation                        *
 *             Responsible of Kin's Expressions Evaluation              *
 ***********************************************************************/

import {
  BooleanVal,
  FunctionValue,
  MK_ARRAY,
  MK_BOOL,
  MK_NULL,
  MK_NUMBER,
  MK_STRING,
  NativeFnValue,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
  typeName,
  valuesEqual,
} from '../values';
import {
  Identifier,
  AssignmentExpr,
  ObjectLiteral,
  ArrayLiteral,
  MemberExpr,
  BinaryExpr,
  CallExpr,
  UnaryExpr,
  ReturnExpr,
} from '../../parser/ast';

import Environment from '../environment';
import { Interpreter } from '../interpreter';
import { createKinError } from '../../lib/errors';
import { BreakSignal, ContinueSignal, ReturnSignal } from '../signals';
import { Span } from '../../lib/span';

type BinOp = (lhs: RuntimeVal, rhs: RuntimeVal, span?: Span) => RuntimeVal;

function num(v: RuntimeVal): number {
  return (v as NumberVal).value;
}

function str(v: RuntimeVal): string {
  return (v as StringVal).value;
}

/** Dispatch table keyed by "leftType::op::rightType". */
const binaryOps: Record<string, BinOp> = {
  'number::+::number': (l, r) => MK_NUMBER(num(l) + num(r)),
  'number::-::number': (l, r) => MK_NUMBER(num(l) - num(r)),
  'number::*::number': (l, r) => MK_NUMBER(num(l) * num(r)),
  'number::/::number': (l, r) => MK_NUMBER(num(l) / num(r)),
  'number::^::number': (l, r) => MK_NUMBER(num(l) ** num(r)),
  'number::%::number': (l, r) => MK_NUMBER(num(l) % num(r)),
  'number::<::number': (l, r) => MK_BOOL(num(l) < num(r)),
  'number::>::number': (l, r) => MK_BOOL(num(l) > num(r)),
  'number::<=::number': (l, r) => MK_BOOL(num(l) <= num(r)),
  'number::>=::number': (l, r) => MK_BOOL(num(l) >= num(r)),

  // String concatenation. number is coerced so beginners can write
  // "Ufite imyaka " + imyaka without an extra conversion step.
  'string::+::string': (l, r) => MK_STRING(str(l) + str(r)),
  'string::+::number': (l, r) => MK_STRING(str(l) + String(num(r))),
  'number::+::string': (l, r) => MK_STRING(String(num(l)) + str(r)),

  // Locale-independent string comparison (UTF-16 code units).
  'string::<::string': (l, r) => MK_BOOL(str(l) < str(r)),
  'string::>::string': (l, r) => MK_BOOL(str(l) > str(r)),
  'string::<=::string': (l, r) => MK_BOOL(str(l) <= str(r)),
  'string::>=::string': (l, r) => MK_BOOL(str(l) >= str(r)),
};

// Logical operators use a separate path so the key never collides with
// the '|' field separator (boolean|||boolean was ambiguous).

export default class EvalExpr {
  public static eval_identifier(
    ident: Identifier,
    env: Environment,
  ): RuntimeVal {
    return env.lookupVar(ident.symbol);
  }

  public static eval_binary_expr(
    node: BinaryExpr,
    env: Environment,
  ): RuntimeVal {
    const lhs = Interpreter.evaluate(node.left, env);
    const rhs = Interpreter.evaluate(node.right, env);
    return this.eval_binary_op(lhs, rhs, node.operator, node.span);
  }

  public static eval_unary_expr(node: UnaryExpr, env: Environment): RuntimeVal {
    const operand: RuntimeVal = Interpreter.evaluate(node.operand, env);
    switch (node.operator) {
      case '!':
        if (operand.type === 'boolean') {
          return MK_BOOL(!(operand as BooleanVal).value);
        }
        // Truthiness-based not for non-booleans.
        if (operand.type === 'null') return MK_BOOL(true);
        if (operand.type === 'number') {
          return MK_BOOL((operand as NumberVal).value === 0);
        }
        return MK_BOOL(false);
      case '-':
        if (operand.type !== 'number') {
          throw createKinError('K024', {
            span: node.span,
            params: { op: '-', type: typeName(operand) },
            message: `Unary operator '-' is not supported on ${typeName(operand)}`,
          });
        }
        return MK_NUMBER(-(operand as NumberVal).value);
      default:
        throw createKinError('K024', {
          span: node.span,
          params: { op: node.operator, type: typeName(operand) },
          message: `Unsupported unary operator ${node.operator}`,
        });
    }
  }

  public static eval_assignment(
    node: AssignmentExpr,
    env: Environment,
  ): RuntimeVal {
    if (node.assigne.kind === 'MemberExpression')
      return this.eval_member_expr(env, node);
    if (node.assigne.kind !== 'Identifier') {
      throw createKinError('K023', {
        span: node.assigne.span,
        message: `Invalid left-hand-side expression: ${JSON.stringify(node.assigne)}.`,
      });
    }

    const varname = (node.assigne as Identifier).symbol;
    return env.assignVar(
      varname,
      Interpreter.evaluate(node.value, env),
      node.span,
    );
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

  public static eval_array_expr(
    arr: ArrayLiteral,
    env: Environment,
  ): RuntimeVal {
    const elements = arr.elements.map((el) => Interpreter.evaluate(el, env));
    return MK_ARRAY(elements);
  }

  public static eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
    const args = expr.args.map((arg) => Interpreter.evaluate(arg, env));
    const fn = Interpreter.evaluate(expr.caller, env);

    if (fn.type == 'native-fn') {
      return (fn as NativeFnValue).call(args, env);
    }

    if (fn.type == 'fn') {
      const func = fn as FunctionValue;
      const scope = new Environment(func.declarationEnv);

      if (args.length != func.parameters.length) {
        throw createKinError('K011', {
          span: expr.span,
          params: {
            expected: func.parameters.length,
            got: args.length,
          },
          message:
            "Kin Error: number of function's arguments must equal to it's the parameters",
        });
      }

      for (let i = 0; i < func.parameters.length; i++) {
        scope.declareVar(func.parameters[i], args[i], false);
      }

      try {
        for (const stmt of func.body) {
          Interpreter.evaluate(stmt, scope);
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.value;
        }
        if (e instanceof BreakSignal) {
          throw createKinError('K019', {
            span: expr.span,
            params: { name: 'hagarara' },
            message: 'hagarara cannot be used across a function boundary',
          });
        }
        if (e instanceof ContinueSignal) {
          throw createKinError('K019', {
            span: expr.span,
            params: { name: 'komeza' },
            message: 'komeza cannot be used across a function boundary',
          });
        }
        throw e;
      }

      return MK_NULL();
    }

    throw createKinError('K010', {
      span: expr.span,
      message:
        'Cannot call value that is not a function: ' + JSON.stringify(fn),
    });
  }

  public static eval_return_expr(
    expr: ReturnExpr,
    env: Environment,
  ): RuntimeVal {
    const value = expr.value
      ? Interpreter.evaluate(expr.value, env)
      : MK_NULL();
    throw new ReturnSignal(value);
  }

  public static eval_member_expr(
    env: Environment,
    node?: AssignmentExpr,
    expr?: MemberExpr,
  ): RuntimeVal {
    if (expr) {
      return env.lookupMember(expr);
    } else if (node) {
      return env.assignMember(
        node.assigne as MemberExpr,
        Interpreter.evaluate(node.value, env),
      );
    } else {
      throw createKinError('K027', {
        message:
          'Evaluating a member expression is not possible without a member or assignment expression.',
      });
    }
  }

  private static eval_binary_op(
    lhs: RuntimeVal,
    rhs: RuntimeVal,
    operator: string,
    span?: Span,
  ): RuntimeVal {
    if (operator === '==') {
      return MK_BOOL(valuesEqual(lhs, rhs));
    }
    if (operator === '!=') {
      return MK_BOOL(!valuesEqual(lhs, rhs));
    }

    if (operator === '&&' || operator === '||') {
      if (lhs.type !== 'boolean' || rhs.type !== 'boolean') {
        throw createKinError('K012', {
          span,
          params: {
            op: operator,
            left: typeName(lhs),
            right: typeName(rhs),
          },
          message: `Operator '${operator}' cannot be applied to ${typeName(lhs)} and ${typeName(rhs)}`,
        });
      }
      const lv = (lhs as BooleanVal).value;
      const rv = (rhs as BooleanVal).value;
      return MK_BOOL(operator === '&&' ? lv && rv : lv || rv);
    }

    // Separator is '::' so operators that contain '|' never collide.
    const key = `${lhs.type}::${operator}::${rhs.type}`;
    const impl = binaryOps[key];
    if (impl) {
      return impl(lhs, rhs, span);
    }

    throw createKinError('K012', {
      span,
      params: {
        op: operator,
        left: typeName(lhs),
        right: typeName(rhs),
      },
      message: `Operator '${operator}' cannot be applied to ${typeName(lhs)} and ${typeName(rhs)}`,
    });
  }
}
