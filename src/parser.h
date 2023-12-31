/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#ifndef KIN_PARSER
#define kIN_PARSER

#include "lexer.h"

void parser();
Token* initializeTokens();
Token currentToken(Token **tokens);
Token previousToken(Token **tokens);
Token nextToken(Token **tokens);

#endif
