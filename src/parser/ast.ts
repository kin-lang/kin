/**********************************************
 *                 AST Types                  *
 *     Defines the structure of Kin's AST     *
 **********************************************/

import { Span, emptySpan, mergeSpans } from '../lib/span';

export type NodeType =
  // Statements
  | 'Program'
  | 'VariableDeclaration'
  | 'FunctionDeclaration'
  | 'TypeAliasDeclaration'
  | 'ClassDeclaration'
  | 'FieldInitStatement'
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
  | 'RemaExpr'

  // Literals
  | 'ObjectLiteral'
  | 'ArrayLiteral'
  | 'NumericLiteral'
  | 'StringLiteral'
  | 'Identifier'
  | 'Property'

  // Type AST (kept through parse → runtime; not erased)
  | 'NamedType'
  | 'ObjectType'
  | 'UnionType'
  | 'PickType'
  | 'TypeAnnotation';

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

// ---------------------------------------------------------------------------
// Type AST
// Types are tokenized and parsed into these nodes, then checked at runtime.
// ---------------------------------------------------------------------------

/** Named type reference: `number`, `string`, `Person`, … */
export interface NamedType {
  kind: 'NamedType';
  name: string;
  span: Span;
}

/** One property inside an object type: `name: string` */
export interface ObjectTypeProperty {
  key: string;
  type: TypeNode;
  span: Span;
}

/** Object type literal: `{ name: string, age: number }` */
export interface ObjectType {
  kind: 'ObjectType';
  properties: ObjectTypeProperty[];
  span: Span;
}

/** Union: `string | number` */
export interface UnionType {
  kind: 'UnionType';
  members: TypeNode[];
  span: Span;
}

/**
 * Select keys from an object type: `Fata<Person, "name" | "age">`
 * (TypeScript Pick). `target` is the source type; `keys` are kept.
 */
export interface PickType {
  kind: 'PickType';
  target: TypeNode;
  keys: string[];
  span: Span;
}

/** Any type expression node (before optional `?` wrapping). */
export type TypeNode = NamedType | ObjectType | UnionType | PickType;

/**
 * Full annotation as written after `:` — may be optional (`number?`).
 */
export interface TypeAnnotation {
  kind: 'TypeAnnotation';
  type: TypeNode;
  /** When true, `ubusa` is also accepted. */
  optional: boolean;
  span: Span;
}

/**
 * Function parameter with optional type annotation.
 */
export interface FunctionParameter {
  name: string;
  typeAnnotation?: TypeAnnotation;
  span: Span;
}

/**
 * Defines a variable declaration
 */
export interface VariableDeclaration extends Stmt {
  kind: 'VariableDeclaration';
  constant: boolean;
  identifier: string;
  typeAnnotation?: TypeAnnotation;
  value?: Expr;
}

/**
 * Named type alias: `ubwoko Person = { name: ijambo }`
 */
export interface TypeAliasDeclaration extends Stmt {
  kind: 'TypeAliasDeclaration';
  name: string;
  type: TypeNode;
}

export type Visibility = 'rusange' | 'bwite';

/**
 * Class declaration: `imiterere Name ikomoka Parent? { … }`
 */
export interface ClassDeclaration extends Stmt {
  kind: 'ClassDeclaration';
  name: string;
  /** Parent class name when `ikomoka Parent` is present. */
  parentName?: string;
  constructor?: ClassConstructor;
  methods: ClassMethod[];
}

export interface ClassConstructor {
  parameters: FunctionParameter[];
  body: Stmt[];
  span: Span;
}

export interface ClassMethod {
  visibility: Visibility;
  name: string;
  parameters: FunctionParameter[];
  returnType?: TypeAnnotation;
  body: Stmt[];
  span: Span;
}

/**
 * Field creation inside tegura: `rusange _.izina = expr`
 */
export interface FieldInitStatement extends Stmt {
  kind: 'FieldInitStatement';
  visibility: Visibility;
  name: string;
  value: Expr;
}

/**
 * Instantiate a class: `rema ClassName(args)`
 */
export interface RemaExpr extends Expr {
  kind: 'RemaExpr';
  classExpr: Expr;
  args: Expr[];
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
  parameters: FunctionParameter[];
  returnType?: TypeAnnotation;
  body: Stmt[];
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
  typeAnnotation?: TypeAnnotation,
): VariableDeclaration {
  return {
    kind: 'VariableDeclaration',
    identifier,
    constant,
    value,
    typeAnnotation,
    span,
  };
}

export function mkTypeAlias(
  name: string,
  type: TypeNode,
  span: Span,
): TypeAliasDeclaration {
  return { kind: 'TypeAliasDeclaration', name, type, span };
}

export function mkClassDecl(
  name: string,
  parentName: string | undefined,
  ctor: ClassConstructor | undefined,
  methods: ClassMethod[],
  span: Span,
): ClassDeclaration {
  return {
    kind: 'ClassDeclaration',
    name,
    parentName,
    constructor: ctor,
    methods,
    span,
  };
}

export function mkFieldInit(
  visibility: Visibility,
  name: string,
  value: Expr,
  span: Span,
): FieldInitStatement {
  return { kind: 'FieldInitStatement', visibility, name, value, span };
}

export function mkRema(
  classExpr: Expr,
  args: Expr[],
  span: Span,
): RemaExpr {
  return { kind: 'RemaExpr', classExpr, args, span };
}

export function mkNamedType(name: string, span: Span): NamedType {
  return { kind: 'NamedType', name, span };
}

export function mkObjectType(
  properties: ObjectTypeProperty[],
  span: Span,
): ObjectType {
  return { kind: 'ObjectType', properties, span };
}

export function mkUnionType(members: TypeNode[], span: Span): UnionType {
  return { kind: 'UnionType', members, span };
}

export function mkPickType(
  target: TypeNode,
  keys: string[],
  span: Span,
): PickType {
  return { kind: 'PickType', target, keys, span };
}

export function mkTypeAnnotation(
  type: TypeNode,
  optional: boolean,
  span: Span,
): TypeAnnotation {
  return { kind: 'TypeAnnotation', type, optional, span };
}

export function mkFunctionParam(
  name: string,
  span: Span,
  typeAnnotation?: TypeAnnotation,
): FunctionParameter {
  return { name, typeAnnotation, span };
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
  parameters: FunctionParameter[],
  body: Stmt[],
  span: Span,
  returnType?: TypeAnnotation,
): FunctionDeclaration {
  return {
    kind: 'FunctionDeclaration',
    name,
    parameters,
    returnType,
    body,
    span,
  };
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
