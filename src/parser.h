/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#ifndef KIN_PARSER
#define kIN_PARSER

#include "lexer.h"

void parser();
Token* tokenize();
Token expect(TokenType type);
Token current_token();
Token previous_token();
Token next_token();

#endif
