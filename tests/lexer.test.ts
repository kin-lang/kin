import { describe, test, expect } from 'vitest';
import TokenType from '../src/lexer/tokens';
import Lexer from '../src/lexer/lexer';

describe('Lexer', () => {
  test('should tokenize arithmetic expressions correctly', () => {
    const lexer = new Lexer('1 + 2 * 3 / (4 - 2)');
    const tokens = lexer.tokenize();
    const expectedTokens = [
      { line: 1, type: TokenType.INTEGER, lexeme: '1' },
      { line: 1, type: TokenType.PLUS, lexeme: '+' },
      { line: 1, type: TokenType.INTEGER, lexeme: '2' },
      { line: 1, type: TokenType.STAR, lexeme: '*' },
      { line: 1, type: TokenType.INTEGER, lexeme: '3' },
      { line: 1, type: TokenType.DIVISION, lexeme: '/' },
      { line: 1, type: TokenType.OPEN_PARANTHESES, lexeme: '(' },
      { line: 1, type: TokenType.INTEGER, lexeme: '4' },
      { line: 1, type: TokenType.MINUS, lexeme: '-' },
      { line: 1, type: TokenType.INTEGER, lexeme: '2' },
      { line: 1, type: TokenType.CLOSE_PARANTHESES, lexeme: ')' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ];
    expect(tokens).toEqual(expectedTokens);
  });

  test('should tokenize variable assignment correctly', () => {
    const lexer = new Lexer('reka x = 42');
    const tokens = lexer.tokenize();

    const expectedTokens = [
      { line: 1, type: TokenType.REKA, lexeme: 'reka' },
      { line: 1, type: TokenType.IDENTIFIER, lexeme: 'x' },
      { line: 1, type: TokenType.EQUAL, lexeme: '=' },
      { line: 1, type: TokenType.INTEGER, lexeme: '42' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ];
    expect(tokens).toEqual(expectedTokens);
  });

  test('should tokenize string literals correctly', () => {
    const lexer = new Lexer('"Hello, world!"');
    const tokens = lexer.tokenize();
    const expectedTokens = [
      { type: TokenType.STRING, lexeme: 'Hello, world!', line: 1 },
      { type: TokenType.EOF, lexeme: 'EOF', line: 1 },
    ];
    expect(tokens).toEqual(expectedTokens);
  });

  test('should tokenize comments and ignore whitespace', () => {
    const lexer = new Lexer(`
      # This is a comment
      reka a = 10 # Another comment
    `);
    const tokens = lexer.tokenize();

    const expectedTokens = [
      { line: 3, type: TokenType.REKA, lexeme: 'reka' },
      { line: 3, type: TokenType.IDENTIFIER, lexeme: 'a' },
      { line: 3, type: TokenType.EQUAL, lexeme: '=' },
      { line: 3, type: TokenType.INTEGER, lexeme: '10' },
      { line: 4, type: TokenType.EOF, lexeme: 'EOF' },
    ];
    expect(tokens).toEqual(expectedTokens);
  });

  test('should handle errors for unexpected characters', () => {
    const lexer = new Lexer('let x = ~;');
    expect(() => lexer.tokenize()).toThrowError(
      "Unexpected character '~' at line 1",
    );
  });
});
