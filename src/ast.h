/*
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "lexer.h"

#ifndef KIN_AST
#define KIN_AST

// AST node types
typedef enum {
    // Statements
    AST_PROGRAM,
    AST_VARIABLE_DECLARATION,
    AST_FUNCTION_DECLARATION,
    AST_IF_STATEMENT,
    AST_LOOP_STATEMENT,

    // Expressions
    AST_ASSIGNMENT_EXPRESSION,
    AST_CALL_EXPRESSION,
    AST_BINARY_EXPRESSION,
    AST_UNARY_EXPRESSION,
    AST_MEMBER_EXPRESSION,

    // Literals
    AST_INTEGER_LITERAL,
    AST_FLOAT_LITERAL,
    AST_STRING_LITERAL,
    AST_LIST_LITERAL,
    AST_STRUCTURE,
} ASTNodeType;

// Forward declarations
typedef struct Stmt Stmt;
typedef struct Expr Expr;

// AST Nodes
typedef struct Program {
    ASTNodeType kind;
    Stmt* statements;
    int stmt_count;
} Program;

typedef struct VariableDeclaration {
    ASTNodeType kind;
    bool constant;
    char* identifier;
    Expr value;
} VariableDeclaration;

typedef struct IfStatement {
    ASTNodeType kind;
    Expr test;
    Stmt* body;
    Stmt* alternate;
} IfStatement;

typedef struct LoopStatement {
    ASTNodeType kind;
    Stmt test;
    Stmt* body;
} LoopStatement;

typedef struct FunctionDeclaration {
    ASTNodeType kind;
    char* parameters;
    char* name;
    Stmt* body;
} FunctionDeclaration;

typedef struct BinaryExpression {
    ASTNodeType kind;
    Expr left;
    Expr right;
    Token operator;
} BinaryExpression;

typedef struct UnaryExpression {
    ASTNodeType kind;
    Expr argument;
    Token operator;
} UnaryExpression;

typedef struct CallExpression {
    ASTNodeType kind;
    Expr callee;
    Expr* arguments;
} CallExpression;

typedef struct MemberExpression {
    ASTNodeType kind;
    Expr structure;
    Expr property;
    bool computed;
} MemberExpression;

typedef struct AssignmentExpression {
    ASTNodeType kind;
    Expr left;
    Expr right;
} AssignmentExpression;

typedef struct Identifier {
    ASTNodeType kind;
    char* name;
} Identifier;

// Union to represent different literal types
typedef union {
    int int_value;
    float float_value;
    char* string_value;
    Expr* list_elements;
} LiteralValue;

typedef struct Literal {
    ASTNodeType kind;
    LiteralValue value;
} Literal;

// Union to represent different expression types
typedef union {
    BinaryExpression binary_expr;
    UnaryExpression unary_expr;
    CallExpression call_expr;
    MemberExpression member_expr;
    AssignmentExpression assign_expr;
    Literal literal_expr;
} Expression;

// Union to represent different statement types
typedef union {
    Program program_stmt;
    VariableDeclaration var_decl_stmt;
    IfStatement if_stmt;
    LoopStatement loop_stmt;
    FunctionDeclaration func_decl_stmt;
} Statement;

// Structure representing an expression
struct Expr {
    ASTNodeType kind;
    Expression expr;
};

// Structure representing a statement
struct Stmt {
    ASTNodeType kind;
    Statement stmt;
};

#endif
