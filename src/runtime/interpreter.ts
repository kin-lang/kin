/*************************************************************************************************************
 *                                                    Interpreter                                            *
 *              Kin's Interpreter entry point, for walking Kin's AST by it's evaluate static method          *
 *************************************************************************************************************/

import { NumberVal, RuntimeVal, StringVal } from './values';
import {
  ArrayLiteral,
  AssignmentExpr,
  BinaryExpr,
  BreakStatement,
  ClassDeclaration,
  ContinueStatement,
  CallExpr,
  FieldInitExpr,
  LoopStatement,
  FunctionDeclaration,
  Identifier,
  MemberExpr,
  NewExpr,
  NumericLiteral,
  ObjectLiteral,
  Program,
  Stmt,
  StringLiteral,
  ConditionalStmt,
  VariableDeclaration,
  UnaryExpr,
  ReturnExpr,
} from '../parser/ast';

import Environment, { MethodContext } from './environment';
import EvalExpr from './eval/expressions';
import EvalStmt from './eval/statements';
import { KinError, createKinError } from '../lib/errors';
import { Span } from '../lib/span';

export class Interpreter {
  /** Span of the node currently being evaluated (for runtime errors). */
  public static currentSpan: Span | undefined;

  /**
   * Active tegura / method frames. Push on enter, pop on exit — never sticky
   * on Environment, so nested functions cannot keep constructor privileges.
   */
  private static methodContextStack: MethodContext[] = [];

  public static pushMethodContext(ctx: MethodContext): void {
    this.methodContextStack.push(ctx);
  }

  public static popMethodContext(): void {
    this.methodContextStack.pop();
  }

  public static getMethodContext(): MethodContext | undefined {
    if (this.methodContextStack.length === 0) return undefined;
    return this.methodContextStack[this.methodContextStack.length - 1];
  }

  public static evaluate(astNode: Stmt, env: Environment): RuntimeVal {
    const previous = this.currentSpan;
    this.currentSpan = astNode.span;
    try {
      switch (astNode.kind) {
        case 'Program':
          return EvalStmt.eval_program(astNode as Program, env);
        case 'NumericLiteral':
          return {
            value: (astNode as NumericLiteral).value,
            type: 'number',
          } as NumberVal;
        case 'StringLiteral':
          return {
            value: (astNode as StringLiteral).value,
            type: 'string',
          } as StringVal;
        case 'Identifier':
          return EvalExpr.eval_identifier(astNode as Identifier, env);
        case 'ObjectLiteral':
          return EvalExpr.eval_object_expr(astNode as ObjectLiteral, env);
        case 'ArrayLiteral':
          return EvalExpr.eval_array_expr(astNode as ArrayLiteral, env);
        case 'CallExpression':
          return EvalExpr.eval_call_expr(astNode as CallExpr, env);
        case 'AssignmentExpression':
          return EvalExpr.eval_assignment(astNode as AssignmentExpr, env);
        case 'BinaryExpr':
          return EvalExpr.eval_binary_expr(astNode as BinaryExpr, env);
        case 'UnaryExpr':
          return EvalExpr.eval_unary_expr(astNode as UnaryExpr, env);
        case 'NewExpression':
          return EvalExpr.eval_new_expr(astNode as NewExpr, env);
        case 'FieldInitExpression':
          return EvalStmt.eval_field_init(astNode as FieldInitExpr, env);
        case 'MemberExpression':
          return EvalExpr.eval_member_expr(
            env,
            undefined,
            astNode as MemberExpr,
          );
        case 'ConditionalStatement':
          return EvalStmt.eval_conditional_statement(
            astNode as ConditionalStmt,
            env,
          );
        case 'LoopStatement':
          return EvalStmt.eval_loop_statement(astNode as LoopStatement, env);
        case 'BreakStatement':
          return EvalStmt.eval_break_statement(astNode as BreakStatement);
        case 'ContinueStatement':
          return EvalStmt.eval_continue_statement(astNode as ContinueStatement);
        case 'VariableDeclaration':
          return EvalStmt.eval_val_declaration(
            astNode as VariableDeclaration,
            env,
          );
        case 'FunctionDeclaration':
          return EvalStmt.eval_function_declaration(
            astNode as FunctionDeclaration,
            env,
          );
        case 'ClassDeclaration':
          return EvalStmt.eval_class_declaration(
            astNode as ClassDeclaration,
            env,
          );
        case 'ReturnExpr':
          return EvalExpr.eval_return_expr(astNode as ReturnExpr, env);
        default:
          throw createKinError('K026', {
            span: astNode.span,
            message:
              'AST of unknown kind found. Cannot evaluate. Exiting. Please report this to Kin developers',
          });
      }
    } catch (e) {
      // Attach the current span to KinErrors that have none.
      if (e instanceof KinError && !e.span && this.currentSpan) {
        throw createKinError(e.code, {
          span: this.currentSpan,
          params: e.params,
          message: e.message,
          cause: e,
        });
      }
      throw e;
    } finally {
      this.currentSpan = previous;
    }
  }
}
