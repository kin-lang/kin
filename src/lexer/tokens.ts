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
  HAGARARA,
  KOMEZA,
  TANGA,
  POROGARAMU_NTOYA,
  REKA,
  GERERANYA,
  USANZE,
  IBINDI,
  /** Class declaration: imiterere Name { ... } */
  IMITERERE,
  /** Constructor inside a class: tegura(params) { ... } */
  TEGURA,
  /** Instantiate: rema ClassName(args) */
  REMA,
  /** Single inheritance: imiterere Child ikomoka Parent */
  IKOMOKA,
  /** Public visibility on class fields/methods */
  RUSANGE,
  /** Private visibility on class fields/methods */
  BWITE,
  /** Prefix type operator: ubwoko value */
  UBWOKO,
  /** Current instance inside tegura / methods (bare `_`) */
  THIS,
  EOF,
}

export default TokenType;
