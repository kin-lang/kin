/**********************************************
 *                 AST Types                  *
 *     Defines the structure of Kin's AST     *
 **********************************************/

export type NodeType =
  //Statements
  | 'Program'
  | 'VariableDeclaration'
  | 'FunctionDeclaration'
  | 'LoopStatement'
  | 'ConditionalStatement'

  // Expressions
  | 'AssignmentExpression'
  | 'MemberExpression'
  | 'CallExpression'
  | 'BinaryExpr'
  | 'ReturnExpr'

  // Literals
  | 'ObjectLiteral'
  | 'NumericLiteral'
  | 'StringLiteral'
  | 'Identifier'
  | 'Property';

/**
 *  Statements do not result in a value at runtime.
 * They contain expressions internally.
 */
export interface Stmt {
  kind: NodeType;
}

/**
 * Expression will result into a value at runtime.
 */
export interface Expr extends Stmt {}

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
 * Defines a function declaration
 */

export interface FunctionDeclaration extends Stmt {
  kind: 'FunctionDeclaration';
  name: string;
  parameters: string[];
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
  operator: string; // must be of type BinaryOperator
  left: Expr;
  right: Expr;
}

// foo["bar"]()  should work
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
 * Represents a numeric constant inside the soure code.
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
