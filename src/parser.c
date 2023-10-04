//core libraries
#include <stdio.h>

// custom headers
#include "headers/parser.h"
#include "headers/lexer.h"


// entry point of Kin's parser.
void parser(char *source_code_buffer) {
    initLexersSource(source_code_buffer); // initialize lexer's source codes.
    while (1) {
        Token token = scanToken();
        printf("Token type: %d, Lexeme: %s, Line: %d\n", token.type, token.lexeme, token.line);
        if (token.type == TOKEN_EOF) break;
    }
}