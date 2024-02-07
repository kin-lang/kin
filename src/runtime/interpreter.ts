import { NumberVal, RuntimeVal, StringVal } from './values';
import {
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  LoopStatement,
  FunctionDeclaration,
  Identifier,
  MemberExpr,
  NumericLiteral,
  ObjectLiteral,
  Program,
  Stmt,
  StringLiteral,
  ConditionalStmt,
  VariableDeclaration,
} from '../parser/ast';

import Environment from './environment';
import Eval_expr from './eval/expressions';
import Eval_stmt from './eval/statements';
import { LogError } from '../lib/log';

export class Interpreter {
  public evaluate(astNode: Stmt, env: Environment): RuntimeVal {
    switch (astNode.kind) {
      case 'Program':
        return Eval_stmt.eval_program(astNode as Program, env);
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
        return Eval_expr.eval_identifier(astNode as Identifier, env);
      case 'ObjectLiteral':
        return Eval_expr.eval_object_expr(astNode as ObjectLiteral, env);
      case 'CallExpression':
        return Eval_expr.eval_call_expr(astNode as CallExpr, env);
      case 'AssignmentExpression':
        return Eval_expr.eval_assignment(astNode as AssignmentExpr, env);
      case 'BinaryExpr':
        return Eval_expr.eval_binary_expr(astNode as BinaryExpr, env);
      case 'MemberExpression':
        return Eval_expr.eval_member_expr(
          env,
          undefined,
          astNode as MemberExpr,
        );
      // Handle statements
      case 'ConditionalStatement':
        return Eval_stmt.eval_conditional_statement(
          astNode as ConditionalStmt,
          env,
        );
      case 'LoopStatement':
        return Eval_stmt.eval_for_statement(astNode as LoopStatement, env);
      case 'VariableDeclaration':
        return Eval_stmt.eval_val_declaration(
          astNode as VariableDeclaration,
          env,
        );
      case 'FunctionDeclaration':
        return Eval_stmt.eval_function_declaration(
          astNode as FunctionDeclaration,
          env,
        );
      default:
        LogError(
          'Kin Error: AST of unknown kind found. Cannot evaluate. Exiting. \n Please report this to Kin developers',
          astNode,
        );
        process.exit(0);
    }
  }
}
