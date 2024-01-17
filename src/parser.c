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

#include <stdio.h>
#include <stdlib.h>
#include "parser.h"
#include "lexer.h"

/* Token array to store all tokens */
Token* tokens = NULL;
int currentTokenIndex = 0;
int tokensArraySize = 0;

/* Function to check if parser got the expected token*/
Token expect(TokenType type) {
    Token prev = previous_token();
    if (prev.type != type) {
        fprintf(stderr, "Error: Unexpected token. Expected %s, but got %s.\n",
                tokenTypeToString(type), prev.lexeme);
        exit(EXIT_FAILURE);
    }

    return prev;
}

/* Function to get the current token */
Token current_token() {
    return tokens[currentTokenIndex];
}

/* Function to get the previous token */
Token previous_token() {
    return tokens[currentTokenIndex - 1];
}

/* Function to get the next token */
Token next_token() {
    return tokens[currentTokenIndex + 1];
}

/* Function to get the eat a token */
Token eat_token() {
    return tokens[currentTokenIndex++];
}

/* Function to tokenize the entire input and return an array of tokens */
Token* tokenize() {
    int currentTokenizerIndex = 0;

    Token token;
    do {
        if (currentTokenizerIndex >= tokensArraySize) {
            tokensArraySize += 10;
            tokens = realloc(tokens, sizeof(Token) * tokensArraySize);
        }

        token = scanToken();
        tokens[currentTokenizerIndex++] = token;
    } while (token.type != TOKEN_EOF);

    return tokens;
}

/* entry point of Kin's parser. */
void parser() {
    tokenize();
    for (;;) {
        Token token = eat_token();
        if (token.type == TOKEN_EOF) break;
        printf("Line: %d\t Token: %s\n", token.line, token.lexeme);
    }
    
}
