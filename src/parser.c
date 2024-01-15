/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


/* core libraries */
#include <stdio.h>
#include <stdlib.h>

/* custom headers */
#include "parser.h"
#include "lexer.h"
#include "common.h"
#include "errors.h"

/* entry point of Kin's parser. */
void parser() {

    initLexersSource();
    for (;;) {
        Token token = scanToken();
        if (token.type == TOKEN_EOF) break;
        printf("Line: %d\t Token: %s\n", token.line, token.lexeme);
    }
    
}
