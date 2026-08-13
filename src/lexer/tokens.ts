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
  /** Single `|` used in type unions (`string | number`) and Pick key lists. */
  PIPE,
  /** `?` marks optional types (`number?`). */
  QUESTION,

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
  /**
   * Type-related keyword: type alias declaration (`ubwoko Person = …`)
   * and typeof prefix operator / paren form (`ubwoko x`, `ubwoko(x)`).
   */
  UBWOKO,

  /* OOP keywords */
  /** Class declaration: `imiterere Name { … }` */
  IMITERERE,
  /** Constructor: `tegura(params) { … }` */
  TEGURA,
  /** Instantiate: `rema ClassName(args)` */
  REMA,
  /** Public visibility */
  RUSANGE,
  /** Private visibility */
  BWITE,
  /** Inheritance: `imiterere Child ikomoka Parent` */
  IKOMOKA,

  /* Modules */
  /** Import: `koresha "./file.kin" nka alias` */
  KORESHA,
  /** Import alias keyword (English `as`) */
  NKA,
  /** Export list: `emerera_gukoresha { name1, name2 }` */
  EMERERA_GUKORESHA,

  EOF,
}

export default TokenType;
