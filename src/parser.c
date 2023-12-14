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

/* Global variables for parser */
int currentTokensPos;
int numberOfTokens;
/* Global variables for parser */

Token previousToken(Token **tokens) {
    return *tokens[currentTokensPos -1];
}
Token nextToken(Token **tokens) {
    return *tokens[currentTokensPos + 1];
}
Token currentToken(Token **tokens) {
    Token token = *tokens[currentTokensPos];
    currentTokensPos++;

    return token;
}

/* get tokens from the lexer (tokenizer) our tokens */
Token* initializeTokens() {
    initLexersSource(); /* Initialize our lexer's source */
    Token *tokens = (Token *) malloc(sizeof(Token) * (int) source_code_info.size);
    if (tokens == NULL) {
        memoryError(ERROR_INSUFFICIENT_MEMORY, "Memory Error: No enough memory to run this program");
    }

    int i = 0;
    for (i = 0 ; ; i++) {
        Token token = scanToken();
        tokens[i] = token;
        numberOfTokens++;
        printf("%d:     \t %s \n", token.line, token.lexeme);
        if (token.type == TOKEN_EOF) { // store EOF token before exiting.
            tokens[i] = token;
            break;
        }
    }

    return tokens;
}   


/* entry point of Kin's parser. */
void parser() {
    Token* tokens = initializeTokens();
    free(tokens);
}
    