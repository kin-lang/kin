import {
  ConditionalStmt,
  FunctionDeclaration,
  LoopStatement,
  Program,
  Stmt,
  VariableDeclaration,
} from '../../parser/ast';
import Environment from '../environment';
import { RuntimeVal } from '../values';

export default class eval_stmt {
  public static eval_program(program: Program, env: Environment): RuntimeVal {}
  public static eval_function_declaration(
    declaration: FunctionDeclaration,
    env: Environment,
  ): RuntimeVal {}
  public static eval_val_declaration(
    declaration: VariableDeclaration,
    env: Environment,
  ): RuntimeVal {}
  public static eval_conditional_statement(
    declaration: ConditionalStmt,
    env: Environment,
  ): RuntimeVal {}
  public static eval_for_statement(
    declaration: LoopStatement,
    env: Environment,
  ): RuntimeVal {}
  public static eval_body(
    body: Stmt[],
    env: Environment,
    newEnv: boolean = true,
  ): RuntimeVal {}
}
