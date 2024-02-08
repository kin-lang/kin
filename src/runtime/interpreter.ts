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
import EvalExpr from './eval/expressions';
import EvalStmt from './eval/statements';
import { LogError } from '../lib/log';

export class Interpreter {
  public evaluate(astNode: Stmt, env: Environment): RuntimeVal {
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
      case 'CallExpression':
        return EvalExpr.eval_call_expr(astNode as CallExpr, env);
      case 'AssignmentExpression':
        return EvalExpr.eval_assignment(astNode as AssignmentExpr, env);
      case 'BinaryExpr':
        return EvalExpr.eval_binary_expr(astNode as BinaryExpr, env);
      case 'MemberExpression':
        return EvalExpr.eval_member_expr(env, undefined, astNode as MemberExpr);
      // Handle statements
      case 'ConditionalStatement':
        return EvalStmt.eval_conditional_statement(
          astNode as ConditionalStmt,
          env,
        );
      case 'LoopStatement':
        return EvalStmt.eval_for_statement(astNode as LoopStatement, env);
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
      default:
        LogError(
          'Kin Error: AST of unknown kind found. Cannot evaluate. Exiting. \n Please report this to Kin developers',
          astNode,
        );
        process.exit(0);
    }
  }
}
