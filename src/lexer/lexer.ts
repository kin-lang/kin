/******************************************
 *                 Lexer                  *
 *     Produce tokens from the source     *
 ******************************************/

import TokenType from './tokens';

/* Token structure */
export interface Token {
  type: TokenType;
  lexeme: string;
  line: number;
}

class Lexer {
  private sourceCodes: string;
  private currentPos: number = 0;
  private currentLine: number = 1;

  constructor(sourceCodes: string) {
    this.sourceCodes = sourceCodes;
  }

  /* Function to advance the current position */
  private advance(): void {
    this.currentPos++;
  }

  /* Function to get current character without advancing */
  private peek(): string {
    return this.sourceCodes[this.currentPos];
  }

  /*Function to get current character and advance*/
  private consume(): string {
    const char: string = this.peek();
    this.advance();
    return char;
  }

  /* Function to create a new token with a lexeme */
  private makeTokenWithLexeme(type: TokenType, lexeme: string): Token {
    return {
      line: this.currentLine,
      type,
      lexeme,
    };
  }

  /* check if a given string represents a single alphabetical character*/
  private isSingleAlphaCharacter(s: string): boolean {
    return /^[a-zA-Z]$/.test(s);
  }

  /* check if a given string represents a single digit*/
  private isDigit(s: string): boolean {
    return /^[0-9]$/.test(s);
  }

  /* check if a given string represent a digit or an alphabetical character */
  private alphaNumeric(s: string): boolean {
    return this.isDigit(s) || this.isSingleAlphaCharacter(s);
  }

  /* Ignore comments and whitespaces */
  private skipWhitespaceAndComments(): void {
    while (true) {
      const c: string = this.peek();
      if (c === ' ' || c === '\t' || c === '\r') {
        this.advance();
      } else if (c === '\n') {
        /* Newline character */
        this.advance();
        this.currentLine++;
      } else if (c === '#') {
        /* Comment, skip until the end of the line */
        while (
          this.peek() !== '\n' &&
          this.sourceCodes.length !== this.currentPos
        ) {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  /* Function to scan a number */
  private scanNumber(): Token {
    const start: number = this.currentPos;
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    if (
      this.peek() == '.' &&
      this.isDigit(this.sourceCodes[this.currentPos + 1])
    ) {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
      return this.makeTokenWithLexeme(
        TokenType.FLOAT,
        this.sourceCodes.slice(start, this.currentPos),
      );
    }

    return this.makeTokenWithLexeme(
      TokenType.INTEGER,
      this.sourceCodes.slice(start, this.currentPos),
    );
  }

  /* Function to scan a string litelar */
  private scanStringLiteral(): Token {
    const start: number = this.currentPos;
    const quote: string = this.consume();
    while (this.peek() !== quote) {
      if (this.peek() === '\n' || this.currentPos === this.sourceCodes.length) {
        throw new Error(
          `Unterminated string literal at line ${this.currentLine}`,
        );
      }
      this.advance();
    }

    this.advance();
    return this.makeTokenWithLexeme(
      TokenType.STRING,
      this.sourceCodes.slice(start + 1, this.currentPos - 1),
    );
  }

  /* Function to scan an identifier or a keyword */
  private scanIdentifierOrKeywork(): Token {
    const start: number = this.currentPos;
    while (this.alphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const lexeme: string = this.sourceCodes.slice(start, this.currentPos);

    /* Check if lexeme is a keywork */
    if (lexeme === 'niba')
      return this.makeTokenWithLexeme(TokenType.NIBA, lexeme);
    if (lexeme === 'nanone_niba')
      return this.makeTokenWithLexeme(TokenType.NANONE_NIBA, lexeme);
    if (lexeme === 'umubare')
      return this.makeTokenWithLexeme(TokenType.UMUBARE, lexeme);
    if (lexeme === 'umubare_wibice')
      return this.makeTokenWithLexeme(TokenType.UMUBARE_WIBICE, lexeme);
    if (lexeme === 'niba_byanze')
      return this.makeTokenWithLexeme(TokenType.NIBA_BYANZE, lexeme);
    if (lexeme === 'subiramo_niba')
      return this.makeTokenWithLexeme(TokenType.SUBIRAMO_NIBA, lexeme);
    if (lexeme === 'tanga')
      return this.makeTokenWithLexeme(TokenType.TANGA, lexeme);
    if (lexeme === 'porogaramu_ntoya')
      return this.makeTokenWithLexeme(TokenType.POROGARAMU_NTOYA, lexeme);
    if (lexeme === 'reka')
      return this.makeTokenWithLexeme(TokenType.REKA, lexeme);
    if (lexeme === 'ntahinduka')
      return this.makeTokenWithLexeme(TokenType.NTAHINDUKA, lexeme);

    /* Not a keywork, it's an identifier */
    return this.makeTokenWithLexeme(TokenType.IDENTIFIER, lexeme);
  }

  /* Function to scan the next token */
  private scanToken(): Token {
    this.skipWhitespaceAndComments(); // skip whitespace and comments

    /* Check End Of Source Codes */
    if (this.currentPos == this.sourceCodes.length) {
      return this.makeTokenWithLexeme(TokenType.EOF, 'EOF');
    }

    const char = this.peek();

    switch (char) {
      /* One-Character tokens */
      case '-':
        this.advance();
        if (this.peek() == '-') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.DECREMENT, '--');
        }
        return this.makeTokenWithLexeme(TokenType.MINUS, '-');
      case '+':
        this.advance();
        if (this.peek() == '+') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.INCREMENT, '++');
        }
        return this.makeTokenWithLexeme(TokenType.PLUS, '+');
      case '*':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.STAR, '*');
      case '=':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.EQUALITY, '==');
        }
        return this.makeTokenWithLexeme(TokenType.EQUAL, '=');
      case '/':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.DIVISION, '/');
      case '^':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.EXPONENT, '^');
      case '%':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.MODULO, '%');
      case '&':
        this.advance();
        if (this.peek() == '&') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.AND, '&&');
        }
        return this.makeTokenWithLexeme(TokenType.AMPERSAND, '&');
      case '!':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.NOT_EQUAL, '!=');
        }
        return this.makeTokenWithLexeme(TokenType.NEGATION, '!');
      case '|':
        this.advance();
        if (this.peek() == '|') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.OR, '||');
        }
      case ';':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.SEMI_COLON, ';');
      case ']':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.CLOSE_BRACKET, ']');
      case '[':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.OPEN_BRACKET, '[');
      case '(':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.OPEN_PARANTHESES, '(');
      case ')':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.CLOSE_PARANTHESES, ')');
      case '{':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.OPEN_CURLY_BRACES, '{');
      case '}':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.CLOSE_CURLY_BRACES, '}');
      case '"':
        return this.scanStringLiteral();
      case ':':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.COLON, ':');
      case '>':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeTokenWithLexeme(
            TokenType.GREATER_THAN_OR_EQUAL,
            '>=',
          );
        }
        return this.makeTokenWithLexeme(TokenType.GREATER_THAN, '>');
      case '<':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeTokenWithLexeme(TokenType.LESS_THAN_OR_EQUAL, '<=');
        }
        return this.makeTokenWithLexeme(TokenType.LESS_THAN, '<');
      case ',':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.COMMA, ',');
      case '.':
        this.advance();
        return this.makeTokenWithLexeme(TokenType.DOT, '.');
      default:
        if (!Number.isNaN(Number(char))) {
          return this.scanNumber();
        } else if (this.isSingleAlphaCharacter(char) || char === '_') {
          return this.scanIdentifierOrKeywork();
        } else {
          throw new Error(
            `Unexpected character '${char}' at line ${this.currentLine}`,
          );
        }
    }
  }

  // generate tokens from the source.
  public tokenize(): Token[] {
    const tokens: Token[] = new Array<Token>();
    /* Loop through source codes, scanning tokens */
    for (;;) {
      const token: Token = this.scanToken();
      tokens.push(token);
      if (token.type === TokenType.EOF) break;
    }
    return tokens;
  }
}

export default Lexer;
