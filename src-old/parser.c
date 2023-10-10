/* core libraries */
#include <stdio.h>

/* custom headers */
#include "headers/common.h"
#include "headers/errors.h"
#include "headers/error-codes.h"
#include "headers/parser.h"
#include "headers/lexer.h"


/* entry point of Kin's parser. */
void parser() { /* Initialize our lexer's source */
    initLexersSource();
    while (1) {
        Token token = scanToken();
        printf("Token type: %d, Lexeme: %s, Line: %d\n", token.type, token.lexeme, token.line);
        if (token.type == TOKEN_EOF) break;
    }
    
}