/******************************************
 *                 Lexer                  *
 *     Produce tokens from the source     *
 ******************************************/

import TokenType from './tokens';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';

/* Token structure: full source span plus legacy line field. */
export interface Token {
  type: TokenType;
  lexeme: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export function tokenSpan(token: Token): Span {
  return {
    start: token.start,
    end: token.end,
    line: token.line,
    column: token.column,
  };
}

class Lexer {
  private sourceCodes: string;
  private currentPos: number = 0;
  private currentLine: number = 1;
  private currentColumn: number = 1;

  constructor(sourceCodes: string) {
    this.sourceCodes = sourceCodes;
  }

  /* Advance one character, tracking line and column. */
  private advance(): void {
    const ch = this.sourceCodes[this.currentPos];
    this.currentPos++;
    if (ch === '\n') {
      this.currentLine++;
      this.currentColumn = 1;
    } else {
      this.currentColumn++;
    }
  }

  private peek(): string {
    return this.sourceCodes[this.currentPos];
  }

  private consume(): string {
    const char: string = this.peek();
    this.advance();
    return char;
  }

  private makeToken(
    type: TokenType,
    lexeme: string,
    start: number,
    line: number,
    column: number,
  ): Token {
    return {
      type,
      lexeme,
      line,
      column,
      start,
      end: this.currentPos,
    };
  }

  private isSingleAlphaCharacter(s: string): boolean {
    return /^[a-zA-Z]$/.test(s);
  }

  private isDigit(s: string): boolean {
    return /^[0-9]$/.test(s);
  }

  private alphaNumeric(s: string): boolean {
    return this.isDigit(s) || this.isSingleAlphaCharacter(s);
  }

  private skipWhitespaceAndComments(): void {
    while (true) {
      const c: string = this.peek();
      if (c === ' ' || c === '\t' || c === '\r') {
        this.advance();
      } else if (c === '\n') {
        this.advance();
      } else if (c === '#') {
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

  /**
   * Scan a non-negative number. Unary minus is a separate MINUS token
   * so that `x -5` parses as subtraction, not as `x` followed by `-5`.
   */
  private scanNumber(): Token {
    const start = this.currentPos;
    const line = this.currentLine;
    const column = this.currentColumn;

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
      const nbr = this.sourceCodes.slice(start, this.currentPos);
      return this.makeToken(TokenType.FLOAT, nbr, start, line, column);
    }

    const nbr = this.sourceCodes.slice(start, this.currentPos);
    return this.makeToken(TokenType.INTEGER, nbr, start, line, column);
  }

  private scanStringLiteral(): Token {
    const start = this.currentPos;
    const line = this.currentLine;
    const column = this.currentColumn;
    const quote: string = this.consume();
    while (this.peek() !== quote) {
      if (this.peek() === '\n' || this.currentPos === this.sourceCodes.length) {
        throw createKinError('K003', {
          span: {
            start,
            end: this.currentPos,
            line,
            column,
          },
          message: `Unterminated string literal at line ${line}`,
        });
      }
      this.advance();
    }

    this.advance();
    return this.makeToken(
      TokenType.STRING,
      this.sourceCodes.slice(start + 1, this.currentPos - 1),
      start,
      line,
      column,
    );
  }

  private scanIdentifierOrKeyword(): Token {
    const start = this.currentPos;
    const line = this.currentLine;
    const column = this.currentColumn;
    while (this.alphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const lexeme: string = this.sourceCodes.slice(start, this.currentPos);
    const keywordType = this.keywordType(lexeme);
    if (keywordType !== undefined) {
      return this.makeToken(keywordType, lexeme, start, line, column);
    }
    return this.makeToken(TokenType.IDENTIFIER, lexeme, start, line, column);
  }

  private keywordType(lexeme: string): TokenType | undefined {
    switch (lexeme) {
      case 'niba':
        return TokenType.NIBA;
      case 'nanone_niba':
        return TokenType.NANONE_NIBA;
      case 'niba_byanze':
        return TokenType.NIBA_BYANZE;
      case 'subiramo_niba':
        return TokenType.SUBIRAMO_NIBA;
      case 'hagarara':
        return TokenType.HAGARARA;
      case 'komeza':
        return TokenType.KOMEZA;
      case 'tanga':
        return TokenType.TANGA;
      case 'porogaramu_ntoya':
        return TokenType.POROGARAMU_NTOYA;
      case 'reka':
        return TokenType.REKA;
      case 'ntahinduka':
        return TokenType.NTAHINDUKA;
      case 'gereranya':
        return TokenType.GERERANYA;
      case 'usanze':
        return TokenType.USANZE;
      case 'ibindi':
        return TokenType.IBINDI;
      case 'imiterere':
        return TokenType.IMITERERE;
      case 'tegura':
        return TokenType.TEGURA;
      case 'rema':
        return TokenType.REMA;
      case 'ikomoka':
        return TokenType.IKOMOKA;
      case 'rusange':
        return TokenType.RUSANGE;
      case 'bwite':
        return TokenType.BWITE;
      case 'ubwoko':
        return TokenType.UBWOKO;
      // Bare `_` is the current instance; `_izina` stays an identifier.
      case '_':
        return TokenType.THIS;
      default:
        return undefined;
    }
  }

  private scanToken(): Token {
    this.skipWhitespaceAndComments();

    if (this.currentPos == this.sourceCodes.length) {
      return this.makeToken(
        TokenType.EOF,
        'EOF',
        this.currentPos,
        this.currentLine,
        this.currentColumn,
      );
    }

    const start = this.currentPos;
    const line = this.currentLine;
    const column = this.currentColumn;
    const char = this.peek();

    switch (char) {
      case '-':
        this.advance();
        if (this.peek() == '-') {
          this.advance();
          return this.makeToken(TokenType.DECREMENT, '--', start, line, column);
        }
        // No longer fold digits into a negative literal; unary minus is
        // handled in the parser so `x -5` is subtraction.
        return this.makeToken(TokenType.MINUS, '-', start, line, column);
      case '+':
        this.advance();
        if (this.peek() == '+') {
          this.advance();
          return this.makeToken(TokenType.INCREMENT, '++', start, line, column);
        }
        return this.makeToken(TokenType.PLUS, '+', start, line, column);
      case '*':
        this.advance();
        return this.makeToken(TokenType.STAR, '*', start, line, column);
      case '=':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeToken(TokenType.EQUALITY, '==', start, line, column);
        }
        return this.makeToken(TokenType.EQUAL, '=', start, line, column);
      case '/':
        this.advance();
        return this.makeToken(TokenType.DIVISION, '/', start, line, column);
      case '^':
        this.advance();
        return this.makeToken(TokenType.EXPONENT, '^', start, line, column);
      case '%':
        this.advance();
        return this.makeToken(TokenType.MODULO, '%', start, line, column);
      case '&':
        this.advance();
        if (this.peek() == '&') {
          this.advance();
          return this.makeToken(TokenType.AND, '&&', start, line, column);
        }
        return this.makeToken(TokenType.AMPERSAND, '&', start, line, column);
      case '!':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeToken(TokenType.NOT_EQUAL, '!=', start, line, column);
        }
        return this.makeToken(TokenType.NEGATION, '!', start, line, column);
      case '|':
        this.advance();
        if (this.peek() == '|') {
          this.advance();
          return this.makeToken(TokenType.OR, '||', start, line, column);
        }
        throw createKinError('K004', {
          span: { start, end: this.currentPos, line, column },
          params: { char: '|' },
          message: `Unexpected character '|' at line ${line}`,
        });
      case ';':
        this.advance();
        return this.makeToken(TokenType.SEMI_COLON, ';', start, line, column);
      case ']':
        this.advance();
        return this.makeToken(
          TokenType.CLOSE_BRACKET,
          ']',
          start,
          line,
          column,
        );
      case '[':
        this.advance();
        return this.makeToken(TokenType.OPEN_BRACKET, '[', start, line, column);
      case '(':
        this.advance();
        return this.makeToken(
          TokenType.OPEN_PARANTHESES,
          '(',
          start,
          line,
          column,
        );
      case ')':
        this.advance();
        return this.makeToken(
          TokenType.CLOSE_PARANTHESES,
          ')',
          start,
          line,
          column,
        );
      case '{':
        this.advance();
        return this.makeToken(
          TokenType.OPEN_CURLY_BRACES,
          '{',
          start,
          line,
          column,
        );
      case '}':
        this.advance();
        return this.makeToken(
          TokenType.CLOSE_CURLY_BRACES,
          '}',
          start,
          line,
          column,
        );
      case '"':
        return this.scanStringLiteral();
      case ':':
        this.advance();
        return this.makeToken(TokenType.COLON, ':', start, line, column);
      case '>':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeToken(
            TokenType.GREATER_THAN_OR_EQUAL,
            '>=',
            start,
            line,
            column,
          );
        }
        return this.makeToken(TokenType.GREATER_THAN, '>', start, line, column);
      case '<':
        this.advance();
        if (this.peek() == '=') {
          this.advance();
          return this.makeToken(
            TokenType.LESS_THAN_OR_EQUAL,
            '<=',
            start,
            line,
            column,
          );
        }
        return this.makeToken(TokenType.LESS_THAN, '<', start, line, column);
      case ',':
        this.advance();
        return this.makeToken(TokenType.COMMA, ',', start, line, column);
      case '.':
        this.advance();
        return this.makeToken(TokenType.DOT, '.', start, line, column);
      default:
        if (!Number.isNaN(Number(char))) {
          return this.scanNumber();
        } else if (this.isSingleAlphaCharacter(char) || char === '_') {
          return this.scanIdentifierOrKeyword();
        } else {
          throw createKinError('K004', {
            span: {
              start,
              end: start + 1,
              line,
              column,
            },
            params: { char },
            message: `Unexpected character '${char}' at line ${line}`,
          });
        }
    }
  }

  public tokenize(): Token[] {
    const tokens: Token[] = new Array<Token>();
    for (;;) {
      const token: Token = this.scanToken();
      tokens.push(token);
      if (token.type === TokenType.EOF) break;
    }
    return tokens;
  }
}

export default Lexer;
