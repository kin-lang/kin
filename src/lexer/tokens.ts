/***************************************
 *             Tokens                  *
 *      Valid Tokens in Kin            *
 **************************************/

enum TokenType {
  /* One-character tokens */
  DOT,
  MINUS,
  PLUS,
  STAR,
  DIVISION,
  EXPONENT,
  MODULO,
  AMPERSAND,
  NEGATION,
  SEMI_COLON,
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
  EQUAL,

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
  NIBA,
  NTAHINDUKA,
  NANONE_NIBA,
  NIBA_BYANZE,
  SUBIRAMO_NIBA,
  TANGA,
  POROGARAMU_NTOYA,
  REKA,
  EOF,
}

export default TokenType;
