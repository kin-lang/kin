/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


/* core libraries */
#include <stdio.h>
#include <stdlib.h>

/* custom headers */
#include "headers/parser.h"
#include "headers/lexer.h"
#include "headers/common.h"
#include "headers/errors.h"
#include "headers/error-codes.h"

/* Global variables for parser */
int currentTokensPos;
int numberOfTokens;
/* Global variables for parser */

// get the next token
Token getNextToken(Token **tokens) {
    return *tokens[currentTokensPos];
}

Token consumeToken(Token **tokens) {
    Token token = *tokens[currentTokensPos];
    currentTokensPos++;

    return token;
}

void advance() {
  currentTokensPos++;
}

/* initialize our tokens */
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
    printf("%d", getNextToken(&tokens).type);
    free(tokens);
}
