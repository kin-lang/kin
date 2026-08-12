/***********************************************************************
 *                        Statements Evaluation                        *
 *             Responsible of Kin's Statements Evaluation              *
 ***********************************************************************/

import {
  BreakStatement,
  ConditionalStmt,
  ContinueStatement,
  FunctionDeclaration,
  LoopStatement,
  Program,
  Stmt,
  VariableDeclaration,
} from '../../parser/ast';
import { KinError } from '../../lib/errors';
import Environment from '../environment';
import { Interpreter } from '../interpreter';
import { FunctionValue, MK_NULL, RuntimeVal } from '../values';
import { isTruthy } from '../truthy';
import {
  BreakSignal,
  ContinueSignal,
  isBreakSignal,
  isContinueSignal,
  isReturnSignal,
} from '../signals';

export default class EvalStmt {
  public static eval_program(program: Program, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();

    try {
      for (const statement of program.body) {
        lastEvaluated = Interpreter.evaluate(statement, env);
      }
    } catch (e) {
      if (isContinueSignal(e)) {
        throw new KinError('K013', {
          message: 'komeza can only be used inside a loop',
        });
      }
      if (isBreakSignal(e)) {
        throw new KinError('K014', {
          message: 'hagarara can only be used inside a loop',
        });
      }
      if (isReturnSignal(e)) {
        throw new KinError('K015', {
          message: 'tanga can only be used inside a function',
        });
      }
      throw e;
    }

    return lastEvaluated;
  }

  public static eval_function_declaration(
    declaration: FunctionDeclaration,
    env: Environment,
  ): RuntimeVal {
    const fn = {
      type: 'fn',
      name: declaration.name,
      parameters: declaration.parameters,
      declarationEnv: env,
      body: declaration.body,
    } as FunctionValue;

    return env.declareVar(declaration.name, fn, true);
  }

  public static eval_val_declaration(
    declaration: VariableDeclaration,
    env: Environment,
  ): RuntimeVal {
    const value = declaration.value
      ? Interpreter.evaluate(declaration.value, env)
      : MK_NULL();

    return env.declareVar(declaration.identifier, value, declaration.constant);
  }

  public static eval_conditional_statement(
    declaration: ConditionalStmt,
    env: Environment,
  ): RuntimeVal {
    const test = Interpreter.evaluate(declaration.condition, env);
    if (isTruthy(test)) {
      return this.eval_body(declaration.body, env);
    } else if (declaration.alternate) {
      return this.eval_body(declaration.alternate, env);
    } else {
      return MK_NULL();
    }
  }

  public static eval_loop_statement(
    declaration: LoopStatement,
    env: Environment,
  ): RuntimeVal {
    env = new Environment(env);
    const body = declaration.body;

    let test = Interpreter.evaluate(declaration.condition, env);
    if (!isTruthy(test)) return MK_NULL();

    while (isTruthy(test)) {
      try {
        this.eval_body(body, new Environment(env), false);
      } catch (e) {
        if (e instanceof BreakSignal) {
          break;
        }
        if (e instanceof ContinueSignal) {
          // Fall through to the next condition check.
        } else {
          throw e;
        }
      }
      test = Interpreter.evaluate(declaration.condition, env);
    }

    return MK_NULL();
  }

  public static eval_break_statement(_declaration: BreakStatement): RuntimeVal {
    throw new BreakSignal();
  }

  public static eval_continue_statement(
    _declaration: ContinueStatement,
  ): RuntimeVal {
    throw new ContinueSignal();
  }

  public static eval_body(
    body: Stmt[],
    env: Environment,
    newEnv: boolean = true,
  ): RuntimeVal {
    const scope = newEnv ? new Environment(env) : env;
    let result: RuntimeVal = MK_NULL();

    for (const stmt of body) {
      result = Interpreter.evaluate(stmt, scope);
    }

    return result;
  }
}
