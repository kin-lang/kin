/***********************************************************************
 *                        Statements Evaluation                        *
 *             Responsible of Kin's Statements Evaluation              *
 ***********************************************************************/

import {
  ConditionalStmt,
  FunctionDeclaration,
  LoopStatement,
  Program,
  Stmt,
  VariableDeclaration,
} from '../../parser/ast';
import Environment from '../environment';
import { Interpreter } from '../interpreter';
import { BooleanVal, FunctionValue, MK_NULL, RuntimeVal } from '../values';

export default class EvalStmt {
  public static eval_program(program: Program, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();

    for (const statement of program.body) {
      lastEvaluated = Interpreter.evaluate(statement, env);
    }

    return lastEvaluated;
  }
  public static eval_function_declaration(
    declaration: FunctionDeclaration,
    env: Environment,
  ): RuntimeVal {
    // Create new function scope
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
    if ((test as BooleanVal).value === true) {
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

    if ((test as BooleanVal).value !== true) return MK_NULL(); // The loop didn't start
    while ((test as BooleanVal).value) {
      this.eval_body(body, new Environment(env), false);
      test = Interpreter.evaluate(declaration.condition, env);
    }

    return MK_NULL();
  }
  public static eval_body(
    body: Stmt[],
    env: Environment,
    newEnv: boolean = true,
  ): RuntimeVal {
    let scope: Environment;

    if (newEnv) {
      scope = new Environment(env);
    } else {
      scope = env;
    }
    let result: RuntimeVal = MK_NULL();

    // Evaluate the if body line by line
    for (const stmt of body) {
      // if((stmt as Identifier).symbol === 'continue') return result;
      result = Interpreter.evaluate(stmt, scope);
    }

    return result;
  }

  private eval_body(
    body: Stmt[],
    env: Environment,
    newEnv: boolean = true,
  ): RuntimeVal {
    let scope: Environment;

    if (newEnv) {
      scope = new Environment(env);
    } else {
      scope = env;
    }
    let result: RuntimeVal = MK_NULL();

    // Evaluate the if body line by line
    for (const stmt of body) {
      // if((stmt as Identifier).symbol === 'continue') return result;
      result = Interpreter.evaluate(stmt, scope);
    }

    return result;
  }
}
