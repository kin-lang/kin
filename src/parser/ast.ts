/**********************************************
 *                 AST Types                  *
 *     Defines the structure of Kin's AST     *
 **********************************************/

import { Span, emptySpan, mergeSpans } from '../lib/span';

export type Visibility = 'rusange' | 'bwite';

export type NodeType =
  // Statements
  | 'Program'
  | 'VariableDeclaration'
  | 'FunctionDeclaration'
  | 'ClassDeclaration'
  | 'LoopStatement'
  | 'BreakStatement'
  | 'ContinueStatement'
  | 'ConditionalStatement'

  // Expressions
  | 'AssignmentExpression'
  | 'MemberExpression'
  | 'CallExpression'
  | 'BinaryExpr'
  | 'UnaryExpr'
  | 'ReturnExpr'
  | 'NewExpression'
  | 'FieldInitExpression'

  // Literals
  | 'ObjectLiteral'
  | 'ArrayLiteral'
  | 'NumericLiteral'
  | 'StringLiteral'
  | 'Identifier'
  | 'Property';

/**
 * Statements do not result in a value at runtime.
 * They contain expressions internally.
 */
export interface Stmt {
  kind: NodeType;
  span: Span;
}

/**
 * Expression will result into a value at runtime.
 */
export type Expr = Stmt;

/**
 * Defines a block which contains many statements.
 * Only one program will be contained in a file
 */
export interface Program extends Stmt {
  kind: 'Program';
  body: Stmt[];
}

/**
 * Defines a variable declaration
 */
export interface VariableDeclaration extends Stmt {
  kind: 'VariableDeclaration';
  constant: boolean;
  identifier: string;
  value?: Expr;
}

/**
 * Defines an if statement
 */
export interface ConditionalStmt extends Stmt {
  kind: 'ConditionalStatement';
  condition: Expr;
  body: Stmt[];
  determinant?: Expr;
  alternate?: Stmt[];
}

/**
 * Defines a loop statement
 */
export interface LoopStatement extends Stmt {
  kind: 'LoopStatement';
  condition: Expr;
  body: Stmt[];
}

/**
 * Defines a break statement (hagarara) - exits the current loop
 */
export interface BreakStatement extends Stmt {
  kind: 'BreakStatement';
}

/**
 * Defines a continue statement (komeza) - skips the rest of the current
 * loop iteration and starts the next one
 */
export interface ContinueStatement extends Stmt {
  kind: 'ContinueStatement';
}

/**
 * Defines a function declaration
 */
export interface FunctionDeclaration extends Stmt {
  kind: 'FunctionDeclaration';
  name: string;
  parameters: string[];
  body: Stmt[];
}

/**
 * Method declared on a class (always has rusange or bwite).
 */
export interface ClassMethod {
  visibility: Visibility;
  name: string;
  parameters: string[];
  body: Stmt[];
  span: Span;
}

/**
 * Constructor (tegura) declared on a class.
 */
export interface ClassConstructor {
  parameters: string[];
  body: Stmt[];
  span: Span;
}

/**
 * Class declaration: imiterere Name [ikomoka Parent] { ... }
 * Bound as a constant class value in the enclosing environment.
 */
export interface ClassDeclaration extends Stmt {
  kind: 'ClassDeclaration';
  name: string;
  /** Parent class name when `ikomoka` is present. */
  parent?: string;
  constructorDef?: ClassConstructor;
  methods: ClassMethod[];
}

/**
 * Instantiate a class: rema ClassExpr(args)
 */
export interface NewExpr extends Expr {
  kind: 'NewExpression';
  callee: Expr;
  args: Expr[];
}

/**
 * Field creation inside tegura: rusange _.name = expr / bwite _.name = expr
 */
export interface FieldInitExpr extends Expr {
  kind: 'FieldInitExpression';
  visibility: Visibility;
  name: string;
  value: Expr;
}

/**
 * Defines a return statement
 */
export interface ReturnExpr extends Expr {
  kind: 'ReturnExpr';
  value?: Expr;
}

/**
 * Defines a binary expression
 */
export interface BinaryExpr extends Expr {
  kind: 'BinaryExpr';
  operator: string;
  left: Expr;
  right: Expr;
}

/**
 * Defines a unary expression (! or unary -)
 */
export interface UnaryExpr extends Expr {
  kind: 'UnaryExpr';
  operator: string;
  operand: Expr;
}

export interface CallExpr extends Expr {
  kind: 'CallExpression';
  caller: Expr;
  args: Expr[];
}

export interface MemberExpr extends Expr {
  kind: 'MemberExpression';
  object: Expr;
  property: Expr;
  computed: boolean;
}

export interface AssignmentExpr extends Expr {
  kind: 'AssignmentExpression';
  assigne: Expr;
  value: Expr;
}

/**
 * Represents a user-defined variable or symbol in source.
 */
export interface Identifier extends Expr {
  kind: 'Identifier';
  symbol: string;
}

/**
 * Represents a numeric constant inside the source code.
 */
export interface NumericLiteral extends Expr {
  kind: 'NumericLiteral';
  value: number;
}

export interface StringLiteral extends Expr {
  kind: 'StringLiteral';
  value: string;
}

export interface Property extends Expr {
  kind: 'Property';
  key: string;
  value?: Expr;
}

export interface ObjectLiteral extends Expr {
  kind: 'ObjectLiteral';
  properties: Property[];
}

/** Array literal: [1, 2, 3]. Evaluates to ArrayVal. */
export interface ArrayLiteral extends Expr {
  kind: 'ArrayLiteral';
  elements: Expr[];
}

// ---------------------------------------------------------------------------
// Node factories
// Constructing a node without a span is a type error after this change.
// ---------------------------------------------------------------------------

export function mkProgram(body: Stmt[], span: Span): Program {
  return { kind: 'Program', body, span };
}

export function mkVarDecl(
  identifier: string,
  constant: boolean,
  value: Expr | undefined,
  span: Span,
): VariableDeclaration {
  return { kind: 'VariableDeclaration', identifier, constant, value, span };
}

export function mkConditional(
  condition: Expr,
  body: Stmt[],
  alternate: Stmt[] | undefined,
  span: Span,
): ConditionalStmt {
  return {
    kind: 'ConditionalStatement',
    condition,
    body,
    alternate,
    span,
  };
}

export function mkLoop(
  condition: Expr,
  body: Stmt[],
  span: Span,
): LoopStatement {
  return { kind: 'LoopStatement', condition, body, span };
}

export function mkBreak(span: Span): BreakStatement {
  return { kind: 'BreakStatement', span };
}

export function mkContinue(span: Span): ContinueStatement {
  return { kind: 'ContinueStatement', span };
}

export function mkFunction(
  name: string,
  parameters: string[],
  body: Stmt[],
  span: Span,
): FunctionDeclaration {
  return { kind: 'FunctionDeclaration', name, parameters, body, span };
}

export function mkClass(
  name: string,
  parent: string | undefined,
  constructorDef: ClassConstructor | undefined,
  methods: ClassMethod[],
  span: Span,
): ClassDeclaration {
  return {
    kind: 'ClassDeclaration',
    name,
    parent,
    constructorDef,
    methods,
    span,
  };
}

export function mkClassMethod(
  visibility: Visibility,
  name: string,
  parameters: string[],
  body: Stmt[],
  span: Span,
): ClassMethod {
  return { visibility, name, parameters, body, span };
}

export function mkClassConstructor(
  parameters: string[],
  body: Stmt[],
  span: Span,
): ClassConstructor {
  return { parameters, body, span };
}

export function mkNew(callee: Expr, args: Expr[], span: Span): NewExpr {
  return { kind: 'NewExpression', callee, args, span };
}

export function mkFieldInit(
  visibility: Visibility,
  name: string,
  value: Expr,
  span: Span,
): FieldInitExpr {
  return { kind: 'FieldInitExpression', visibility, name, value, span };
}

export function mkReturn(value: Expr | undefined, span: Span): ReturnExpr {
  return { kind: 'ReturnExpr', value, span };
}

export function mkBinary(
  left: Expr,
  operator: string,
  right: Expr,
): BinaryExpr {
  return {
    kind: 'BinaryExpr',
    left,
    operator,
    right,
    span: mergeSpans(left.span, right.span),
  };
}

export function mkUnary(
  operator: string,
  operand: Expr,
  span: Span,
): UnaryExpr {
  return { kind: 'UnaryExpr', operator, operand, span };
}

export function mkCall(caller: Expr, args: Expr[], span: Span): CallExpr {
  return { kind: 'CallExpression', caller, args, span };
}

export function mkMember(
  object: Expr,
  property: Expr,
  computed: boolean,
  span: Span,
): MemberExpr {
  return { kind: 'MemberExpression', object, property, computed, span };
}

export function mkAssign(assigne: Expr, value: Expr): AssignmentExpr {
  return {
    kind: 'AssignmentExpression',
    assigne,
    value,
    span: mergeSpans(assigne.span, value.span),
  };
}

export function mkIdent(symbol: string, span: Span): Identifier {
  return { kind: 'Identifier', symbol, span };
}

export function mkNumber(value: number, span: Span): NumericLiteral {
  return { kind: 'NumericLiteral', value, span };
}

export function mkString(value: string, span: Span): StringLiteral {
  return { kind: 'StringLiteral', value, span };
}

export function mkProperty(
  key: string,
  value: Expr | undefined,
  span: Span,
): Property {
  return { kind: 'Property', key, value, span };
}

export function mkObject(properties: Property[], span: Span): ObjectLiteral {
  return { kind: 'ObjectLiteral', properties, span };
}

export function mkArray(elements: Expr[], span: Span): ArrayLiteral {
  return { kind: 'ArrayLiteral', elements, span };
}

export { emptySpan, mergeSpans };
export type { Span };
