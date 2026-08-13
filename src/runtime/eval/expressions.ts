/***********************************************************************
 *                        Expressions Evaluation                        *
 *             Responsible of Kin's Expressions Evaluation              *
 ***********************************************************************/

import {
  BooleanVal,
  BoundMethodVal,
  ClassVal,
  FunctionValue,
  InstanceVal,
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
  resolveConstructor,
  typeName,
  typeOfValue,
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
  NewExpr,
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
      case 'ubwoko':
        return typeOfValue(operand);
      default:
        throw createKinError('K024', {
          span: node.span,
          params: { op: node.operator, type: typeName(operand) },
          message: `Unsupported unary operator ${node.operator}`,
        });
    }
  }

  /**
   * rema Class(args) — allocate instance, run tegura (own or inherited).
   */
  public static eval_new_expr(node: NewExpr, env: Environment): RuntimeVal {
    const callee = Interpreter.evaluate(node.callee, env);
    if (callee.type !== 'class') {
      throw createKinError('K039', {
        span: node.span,
        params: { type: typeName(callee) },
        message: `rema expects a class, got ${typeName(callee)}`,
      });
    }
    const klass = callee as ClassVal;
    const instance: InstanceVal = {
      type: 'instance',
      classOf: klass,
      fields: new Map(),
    };

    const ctor = resolveConstructor(klass);
    const args = node.args.map((arg) => Interpreter.evaluate(arg, env));

    if (!ctor) {
      if (args.length !== 0) {
        throw createKinError('K011', {
          span: node.span,
          params: { expected: 0, got: args.length },
          message: `Wrong number of arguments: expected 0, got ${args.length}`,
        });
      }
      return instance;
    }

    if (args.length !== ctor.parameters.length) {
      throw createKinError('K011', {
        span: node.span,
        params: {
          expected: ctor.parameters.length,
          got: args.length,
        },
        message: `Wrong number of arguments: expected ${ctor.parameters.length}, got ${args.length}`,
      });
    }

    const scope = new Environment(klass.declarationEnv);
    // `_` is the instance; constant so it cannot be rebound.
    scope.declareVar('_', instance, true);
    for (let i = 0; i < ctor.parameters.length; i++) {
      scope.declareVar(ctor.parameters[i], args[i], false);
    }

    Interpreter.pushMethodContext({
      declaringClass: ctor.declaringClass,
      instance,
      isConstructor: true,
    });
    try {
      try {
        for (const stmt of ctor.body) {
          Interpreter.evaluate(stmt, scope);
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          // Ignore return value from constructor; instance is the result.
          return instance;
        }
        if (e instanceof BreakSignal) {
          throw createKinError('K019', {
            span: node.span,
            params: { name: 'hagarara' },
            message: 'hagarara cannot be used across a function boundary',
          });
        }
        if (e instanceof ContinueSignal) {
          throw createKinError('K019', {
            span: node.span,
            params: { name: 'komeza' },
            message: 'komeza cannot be used across a function boundary',
          });
        }
        throw e;
      }
    } finally {
      Interpreter.popMethodContext();
    }

    return instance;
  }

  /** Invoke a bound method with `_` bound to the receiver. */
  public static call_bound_method(
    bound: BoundMethodVal,
    args: RuntimeVal[],
    span?: Span,
  ): RuntimeVal {
    const method = bound.method;

    // Private methods may only run while code of the declaring class is active.
    // Lookup already checks this; re-check here so a leaked bound method cannot
    // be invoked from outside.
    if (method.visibility === 'bwite') {
      const ctx = Interpreter.getMethodContext();
      if (!ctx || ctx.declaringClass !== method.declaringClass) {
        throw createKinError('K036', {
          span,
          params: { name: method.name },
          message: `Cannot access private method '${method.name}'`,
        });
      }
    }

    if (args.length !== method.parameters.length) {
      throw createKinError('K011', {
        span,
        params: {
          expected: method.parameters.length,
          got: args.length,
        },
        message: `Wrong number of arguments: expected ${method.parameters.length}, got ${args.length}`,
      });
    }

    const scope = new Environment(method.declaringClass.declarationEnv);
    scope.declareVar('_', bound.instance, true);
    for (let i = 0; i < method.parameters.length; i++) {
      scope.declareVar(method.parameters[i], args[i], false);
    }

    Interpreter.pushMethodContext({
      declaringClass: method.declaringClass,
      instance: bound.instance,
      isConstructor: false,
    });
    try {
      try {
        for (const stmt of method.body) {
          Interpreter.evaluate(stmt, scope);
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.value;
        }
        if (e instanceof BreakSignal) {
          throw createKinError('K019', {
            span,
            params: { name: 'hagarara' },
            message: 'hagarara cannot be used across a function boundary',
          });
        }
        if (e instanceof ContinueSignal) {
          throw createKinError('K019', {
            span,
            params: { name: 'komeza' },
            message: 'komeza cannot be used across a function boundary',
          });
        }
        throw e;
      }
    } finally {
      Interpreter.popMethodContext();
    }

    return MK_NULL();
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

    if (fn.type == 'bound-method') {
      return this.call_bound_method(fn as BoundMethodVal, args, expr.span);
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
      params: { type: typeName(fn) },
      message: `Cannot call a value that is not a function (${typeName(fn)})`,
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
