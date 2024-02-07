import { CallExpr } from '../../parser/ast';
import { RuntimeVal } from '../values';
import {
  Identifier,
  AssignmentExpr,
  ObjectLiteral,
  MemberExpr,
} from '../../parser/ast';

import Environment from '../environment';

export default class Eval_expr {
  public static eval_identifier(
    ident: Identifier,
    env: Environment,
  ): RuntimeVal {}
  public static eval_binary_expr(
    node: AssignmentExpr,
    env: Environment,
  ): RuntimeVal {}
  public static eval_assignment(
    node: AssignmentExpr,
    env: Environment,
  ): RuntimeVal {}
  public static eval_object_expr(
    obj: ObjectLiteral,
    env: Environment,
  ): RuntimeVal {}
  public static eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {}
  public static eval_member_expr(
    env: Environment,
    node?: AssignmentExpr,
    expr?: MemberExpr,
  ): RuntimeVal {}
}
