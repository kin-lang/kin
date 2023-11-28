/*  
    Copyright (c) MURANGWA Pacifique. and affiliates.
    This source code is licensed under the Apache License 2.0 found in the
    LICENSE file in the root directory of this source tree.
*/


#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>

#include "headers/common.h"
#include "headers/lexer.h"
#include "headers/exit-codes.h"
#include "headers/errors.h"
#include "headers/error-codes.h"



char* source; /* Source code */
int currentPos = 0; /* Current position in source */
int line = 1; /* Current line number */ 

/* Function to initialize the source code */
void initLexersSource() {
    source = source_code_info.buffer;
}

/* Function to create a new token with a lexeme */
Token makeTokenWithLexeme(TokenType type, char* lexeme) {
    Token token;
    token.type = type;
    token.lexeme = lexeme;
    token.line = line;
    return token;
}

/* Function to get the current character */
char getCurrentChar() {
  return source[currentPos];
}

/*Function to get current character and advance*/
char consume() {
  char c = getCurrentChar();
  advance(&currentPos);
  return c;
}

/* Function to scan an identifier or keyword */
Token scanIdentifierOrKeyword() {
    int start = currentPos;

    while (isalnum(getCurrentChar()) || getCurrentChar() == '_') {
      advance(&currentPos);
    }

    char* lexeme = strndup(&source[start], currentPos - start);

    /* Check if it's a keyword */
    if (strcmp(lexeme, "ubusa") == 0) return makeTokenWithLexeme(TOKEN_UBUSA, lexeme);
    if (strcmp(lexeme, "niba") == 0) return makeTokenWithLexeme(TOKEN_NIBA, lexeme);
    if (strcmp(lexeme, "nibyo") == 0) return makeTokenWithLexeme(TOKEN_NIBYO, lexeme);
    if (strcmp(lexeme, "sibyo") == 0) return makeTokenWithLexeme(TOKEN_SIBYO, lexeme);
    if (strcmp(lexeme, "nanone_niba") == 0) return makeTokenWithLexeme(TOKEN_NANONE_NIBA, lexeme);
    if (strcmp(lexeme, "umubare") == 0) return makeTokenWithLexeme(TOKEN_UMUBARE, lexeme);
    if (strcmp(lexeme, "umubare_wibice") == 0) return makeTokenWithLexeme(TOKEN_UMUBARE_WIBICE, lexeme);
    if (strcmp(lexeme, "niba_byanze") == 0) return makeTokenWithLexeme(TOKEN_NIBA_BYANZE, lexeme);
    if (strcmp(lexeme, "subiramo") == 0) return makeTokenWithLexeme(TOKEN_SUBIRAMO, lexeme);
    if (strcmp(lexeme, "tanga") == 0) return makeTokenWithLexeme(TOKEN_TANGA, lexeme);
    if (strcmp(lexeme, "porogaramu_ntoya") == 0) return makeTokenWithLexeme(TOKEN_POROGARAMU_NTOYA, lexeme);
    if (strcmp(lexeme, "tangaza_amakuru") == 0) return makeTokenWithLexeme(TOKEN_TANGAZA_AMAKURU, lexeme);
    if (strcmp(lexeme, "injiza_amakuru") == 0) return makeTokenWithLexeme(TOKEN_INJIZA_AMAKURU, lexeme);
    if (strcmp(lexeme, "komeza") == 0) return makeTokenWithLexeme(TOKEN_KOMEZA, lexeme);
    if (strcmp(lexeme, "hagarara") == 0) return makeTokenWithLexeme(TOKEN_HAGARARA, lexeme);
    if (strcmp(lexeme, "ubwoko") == 0) return makeTokenWithLexeme(TOKEN_UBWOKO, lexeme);
    if (strcmp(lexeme, "reka") == 0) return makeTokenWithLexeme(TOKEN_REKA, lexeme);
    if (strcmp(lexeme, "soma_inyandiko") ==0 ) return makeTokenWithLexeme(TOKEN_SOMA_INYANDIKO, lexeme);
    if (strcmp(lexeme, "andika_inyandiko") == 0) return makeTokenWithLexeme(TOKEN_ANDIKA_INYANDIKO, lexeme);
    if (strcmp(lexeme, "vugurura_inyandiko") == 0) return makeTokenWithLexeme(TOKEN_KUVUGURURA_INYANDIKO, lexeme);
    if (strcmp(lexeme, "kin_hagarara") == 0) return makeTokenWithLexeme(TOKEN_KIN_HAGARARA, lexeme);
    if (strcmp(lexeme, "sisitemu") == 0) return makeTokenWithLexeme(TOKEN_SISITEMU, lexeme);

    /* Not a keyword, it's an identifier */
    return makeTokenWithLexeme(TOKEN_IDENTIFIER, lexeme);
}

/* Function to scan a string literal */
Token scanStringLiteral() {
    char delimiter = consume(); /* Single or double quote */
    int start = currentPos ; /* get position where we have delimeter */

    while (getCurrentChar() != delimiter) {
        if (getCurrentChar() == '\0' || getCurrentChar() == '\n') {
            syntaxError(ERROR_UNTERMINATED_STRING_LITERAL, '\n', line);
        }
        advance(&currentPos);
    }

    char* lexeme = strndup(&source[start], currentPos - start);
    advance(&currentPos); /* escape closing delimiter for string litelar. */
    return makeTokenWithLexeme(TOKEN_STRING, lexeme);
}


/* Function to scan a number */
Token scanNumber() {
    int start = currentPos;

    while (isdigit(getCurrentChar())) {
        advance(&currentPos);
    }

    if (getCurrentChar() == '.' && isdigit(source[currentPos + 1])) {
        advance(&currentPos);
        while (isdigit(getCurrentChar())) {
            advance(&currentPos);
        }
        return makeTokenWithLexeme(TOKEN_FLOAT, strndup(&source[start], currentPos - start));
    }

    return makeTokenWithLexeme(TOKEN_NUMBER, strndup(&source[start], currentPos - start));
}

/* Function to skip whitespace and comments */
void skipWhitespaceAndComments() {
    while (true) {
        char c = getCurrentChar();
        if (c == ' ' || c == '\t' || c == '\r') {
            advance(&currentPos);
        } else if (c == '\n') {
            /* Newline character */
            advance(&currentPos);
            line++;
        } else if (c == '#') {
            /* Comment, skip until the end of the line */
            while (getCurrentChar() != '\n' && getCurrentChar() != '\0') {
              advance(&currentPos);
            }
        } else {
            break;
        }
    }
}

/* Function to scan the next token */
Token scanToken() {
    skipWhitespaceAndComments();
    char c = getCurrentChar();

    if (c == '\0') {
        /* End of file */
        return makeTokenWithLexeme(TOKEN_EOF, "EOF");
    }

    switch (c) {
        /* One-character tokens */
        case '-':
            advance(&currentPos);
            if (getCurrentChar() == '-') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_DECREMENT, "decrement");
            }
            return makeTokenWithLexeme(TOKEN_MINUS, "minus");
        case '+':
            advance(&currentPos);
            if ( getCurrentChar() == '+') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_INCREMENT, "increment");
            }
            return makeTokenWithLexeme(TOKEN_PLUS, "plus");
        case '*':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_STAR, "star");
        case '=':
            advance(&currentPos);
            if(getCurrentChar() == '='){
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_EQUALITY, "equality");
            }
            return makeTokenWithLexeme(TOKEN_ASSIGNMENT, "assignment");
        case '/':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_DIVISION, "division");
        case '^':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_POWER, "power");
        case '%':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_MODULO, "modulo");
        case '&':
            advance(&currentPos);
            if (getCurrentChar() == '&') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_AND, "and");
            }
            return makeTokenWithLexeme(TOKEN_AMPERSAND, "ampersand");
        case '|':
            advance(&currentPos);
            if (getCurrentChar() == '|') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_OR, "or");
            }
        case '!':
            advance(&currentPos);
            if (getCurrentChar() == '=') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_NOT_EQUAL, "not_equal");
            }
            return makeTokenWithLexeme(TOKEN_NEGATION, "negation");
        case ';':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_END_OF_LINE, "end-of-line");
        case ']':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_CLOSE_BRACKET, "close-bracket");
        case '[':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_OPEN_BRACKET, "open-bracket");
        case '(':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_OPEN_PARANTHESES, "open-parantheses");
        case ')':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_CLOSE_PARANTHESES, "close-parantheses");
        case '{':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_OPEN_CURLY_BRACES, "open-curly-braces");
        case '}':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_CLOSE_CURLY_BRACES, "close-curly-braces");
        case '\'':
            return scanStringLiteral();
        case '"':
            return scanStringLiteral();
        case ':':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_COLON, "colon");
        case '`':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_BACK_TICKS, "back-ticks");
        case '>':
            advance(&currentPos);
            if (getCurrentChar() == '=') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_GREATER_THAN_OR_EQUAL, "greater-than-or-equal");
            }
            return makeTokenWithLexeme(TOKEN_GREATER_THAN, "greater-than");
        case '<':
            advance(&currentPos);
            if (getCurrentChar() == '=') {
                advance(&currentPos);
                return makeTokenWithLexeme(TOKEN_LESS_THAN_OR_EQUAL, "less-than-or-equal");
            }
            return makeTokenWithLexeme(TOKEN_LESS_THAN, "less-than");
        case '.':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_PERIOD, "period");
        case ',':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_COMMA, "comma");
        case '$':
            advance(&currentPos);
            return makeTokenWithLexeme(TOKEN_DOLLA_SIGN, "dolla-sign");
        default:
            if (isdigit(c)) {
                return scanNumber();
            } else if (isalpha(c) || c == '_') {
                return scanIdentifierOrKeyword();
            } else {
                syntaxError(ERROR_UNEXPECTED_CHARACTER, c, line);
            }
    }
}