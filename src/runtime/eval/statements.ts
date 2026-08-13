/***********************************************************************
 *                        Statements Evaluation                        *
 *             Responsible of Kin's Statements Evaluation              *
 ***********************************************************************/

import {
  BreakStatement,
  ClassDeclaration,
  ConditionalStmt,
  ContinueStatement,
  FieldInitExpr,
  FunctionDeclaration,
  LoopStatement,
  Program,
  Stmt,
  VariableDeclaration,
} from '../../parser/ast';
import { createKinError } from '../../lib/errors';
import Environment from '../environment';
import { Interpreter } from '../interpreter';
import {
  ClassConstructorValue,
  ClassMethodValue,
  ClassVal,
  FunctionValue,
  MK_NULL,
  RuntimeVal,
} from '../values';
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
        throw createKinError('K013', {
          message: 'komeza can only be used inside a loop',
        });
      }
      if (isBreakSignal(e)) {
        throw createKinError('K014', {
          message: 'hagarara can only be used inside a loop',
        });
      }
      if (isReturnSignal(e)) {
        throw createKinError('K015', {
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

  /**
   * imiterere Name [ikomoka Parent] { ... }
   * Declares a constant class value. Methods capture the class reference
   * for private-access checks.
   */
  public static eval_class_declaration(
    declaration: ClassDeclaration,
    env: Environment,
  ): RuntimeVal {
    let parent: ClassVal | undefined;
    if (declaration.parent) {
      const parentVal = env.lookupVar(declaration.parent);
      if (parentVal.type !== 'class') {
        throw createKinError('K038', {
          span: declaration.span,
          params: { name: declaration.parent },
          message: `Parent '${declaration.parent}' is not a class`,
        });
      }
      parent = parentVal as ClassVal;
    }

    const klass: ClassVal = {
      type: 'class',
      name: declaration.name,
      parent,
      methods: new Map(),
      declarationEnv: env,
    };

    if (declaration.constructorDef) {
      const ctor: ClassConstructorValue = {
        parameters: declaration.constructorDef.parameters,
        body: declaration.constructorDef.body,
        declaringClass: klass,
      };
      klass.constructorDef = ctor;
    }

    for (const m of declaration.methods) {
      const method: ClassMethodValue = {
        visibility: m.visibility,
        name: m.name,
        parameters: m.parameters,
        body: m.body,
        declaringClass: klass,
      };
      klass.methods.set(m.name, method);
    }

    return env.declareVar(declaration.name, klass, true);
  }

  public static eval_field_init(
    node: FieldInitExpr,
    env: Environment,
  ): RuntimeVal {
    const value = Interpreter.evaluate(node.value, env);
    return env.initInstanceField(
      node.name,
      node.visibility,
      value,
      node.span,
    );
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
