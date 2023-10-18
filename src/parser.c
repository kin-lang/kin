/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


/* core libraries */
#include <stdio.h>

/* custom headers */
#include "headers/parser.h"
#include "headers/lexer.h"


/* entry point of Kin's parser. */
void parser() {
    initLexersSource(); /* Initialize our lexer's source */
    while (1) {
        Token token = scanToken();
        printf("Token type: %d, Lexeme: %s, Line: %d\n", token.type, token.lexeme, token.line);
        if (token.type == TOKEN_EOF) break;
    }
}