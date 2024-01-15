    /*  
        Copyright (c) MURANGWA Pacifique. and affiliates.
        This source code is licensed under the Apache License 2.0 found in the
        LICENSE file in the root directory of this source tree.
    */


    #ifndef KIN_LEXER_H
    #define KIN_LEXER_H

    typedef enum {
        /* One-character tokens */ 
        TOKEN_MINUS, TOKEN_PLUS, TOKEN_STAR, 
        TOKEN_DIVISION, TOKEN_POWER, TOKEN_MODULO, TOKEN_AMPERSAND,
        TOKEN_NEGATION, TOKEN_END_OF_LINE, TOKEN_CLOSE_BRACKET, TOKEN_OPEN_BRACKET,
        TOKEN_OPEN_PARANTHESES, TOKEN_CLOSE_PARANTHESES,
        TOKEN_OPEN_CURLY_BRACES, TOKEN_CLOSE_CURLY_BRACES,
        TOKEN_SINGLE_QUOTATION, TOKEN_DOUBLE_QUOTATION,
        TOKEN_COLON,
        TOKEN_GREATER_THAN, TOKEN_LESS_THAN, TOKEN_PERIOD, TOKEN_COMMA,
        TOKEN_DOLLA_SIGN, TOKEN_ASSIGNMENT,

        /* Literals */
        TOKEN_IDENTIFIER, TOKEN_STRING, TOKEN_INTEGER, TOKEN_FLOAT,

        /* Two or more characters tokens */
        TOKEN_NOT_EQUAL, TOKEN_EQUALITY, TOKEN_INCREMENT, TOKEN_DECREMENT,
        TOKEN_AND, TOKEN_OR, TOKEN_GREATER_THAN_OR_EQUAL, TOKEN_LESS_THAN_OR_EQUAL,

        /* Keywords */
        TOKEN_UBUSA, TOKEN_NIBA, TOKEN_NIBYO, TOKEN_SIBYO,
        TOKEN_NANONE_NIBA, TOKEN_UMUBARE, TOKEN_UMUBARE_WIBICE,
        TOKEN_NIBA_BYANZE, TOKEN_SUBIRAMO, TOKEN_TANGA, TOKEN_POROGARAMU_NTOYA,
        TOKEN_TANGAZA_AMAKURU, TOKEN_INJIZA_AMAKURU, TOKEN_KOMEZA, TOKEN_HAGARARA,
        TOKEN_UBWOKO, TOKEN_ERROR, TOKEN_KIN_HAGARARA, TOKEN_REKA,
        TOKEN_SOMA_INYANDIKO, TOKEN_ANDIKA_INYANDIKO, TOKEN_KUVUGURURA_INYANDIKO,
        TOKEN_SISITEMU, TOKEN_IJAMBO,
        TOKEN_EOF 
    } TokenType;


    /* Token structure */
    typedef struct {
        TokenType type;
        char* lexeme;
        int line;
    } Token;

    Token scanToken();
    void initLexersSource();
    #endif