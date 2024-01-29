/***************************************
 *             Tokens                  *
 *      Valid Tokens in Kin            *
 **************************************/

enum TokenType {
  /* One-character tokens */
  MINUS,
  PLUS,
  STAR,
  DIVISION,
  EXPONENT,
  MODULO,
  AMPERSAND,
  NEGATION,
  END_OF_LINE,
  OPEN_PARANTHESES,
  CLOSE_PARANTHESES,
  OPEN_BRACKET,
  CLOSE_BRACKET,
  OPEN_CURLY_BRACES,
  CLOSE_CURLY_BRACES,
  SINGLE_QUOTATION,
  DOUBLE_QUOTATION,
  COLON,
  GREATER_THAN,
  LESS_THAN,
  COMMA,
  ASSIGNMENT,

  /* Literals */
  IDENTIFIER,
  STRING,
  INTEGER,
  FLOAT,

  /* Two or more characters tokens */
  NOT_EQUAL,
  EQUALITY,
  INCREMENT,
  DECREMENT,
  AND,
  OR,
  GREATER_THAN_OR_EQUAL,
  LESS_THAN_OR_EQUAL,

  /* Keywords */
  UBUSA,
  NIBA,
  NIBYO,
  SIBYO,
  NTAHINDUKA,
  NANONE_NIBA,
  UMUBARE,
  UMUBARE_WIBICE,
  NIBA_BYANZE,
  SUBIRAMO_NIBA,
  TANGA,
  POROGARAMU_NTOYA,
  TANGAZA_AMAKURU,
  INJIZA_AMAKURU,
  KOMEZA,
  HAGARARA,
  UBWOKO,
  ERROR,
  KIN_HAGARARA,
  REKA,
  SOMA_INYANDIKO,
  ANDIKA_INYANDIKO,
  KUVUGURURA_INYANDIKO,
  SISITEMU,
  IJAMBO,
  EOF,
}

export default TokenType;
