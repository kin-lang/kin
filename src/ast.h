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


// AST Nodes

/** Statements won't result in a value at runtime */
typedef struct Stmt {
    ASTNodeType kind;
} Stmt;

/**  Expressions will result in a value at runtime unlike Statements */
typedef struct Expr {
    ASTNodeType kind;
} Expr;

typedef struct Program {
    ASTNodeType kind;
    Stmt* statements;
} Program;

typedef struct VariableDeclaration {
    ASTNodeType kind;
    bool constant;
    char* identifier;
    Expr* value;
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

typedef struct IntegerLiteral {
    ASTNodeType kind;
    int value;
} IntegerLiteral;

typedef struct FloatLiteral {
    ASTNodeType kind;
    float value;
} FloatLiteral;

typedef struct StringLiteral {
    ASTNodeType kind;
    char* value;
} StringLiteral;

typedef struct ListLiteral {
    ASTNodeType kind;
    Expr* elements;
} ListLiteral;

typedef struct Structure {
    ASTNodeType kind;
    char* name;
    Expr* properties;
} Structure;



#endif