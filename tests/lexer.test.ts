import { describe, test, expect } from 'vitest';
import TokenType from '../src/lexer/tokens';
import Lexer from '../src/lexer/lexer';

/** Compare tokens by type/lexeme/line; column/start/end are structural extras. */
function types(tokens: ReturnType<Lexer['tokenize']>) {
  return tokens.map((t) => ({
    type: t.type,
    lexeme: t.lexeme,
    line: t.line,
  }));
}

describe('Lexer', () => {
  test('should tokenize arithmetic expressions correctly', () => {
    const lexer = new Lexer('1 + 2 * 3 / (4 - 2)');
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
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
    ]);
  });

  test('should tokenize variable assignment correctly', () => {
    const lexer = new Lexer('reka x = 42');
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
      { line: 1, type: TokenType.REKA, lexeme: 'reka' },
      { line: 1, type: TokenType.IDENTIFIER, lexeme: 'x' },
      { line: 1, type: TokenType.EQUAL, lexeme: '=' },
      { line: 1, type: TokenType.INTEGER, lexeme: '42' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ]);
  });

  test('should tokenize hagarara (break) keyword', () => {
    const lexer = new Lexer('hagarara');
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
      { line: 1, type: TokenType.HAGARARA, lexeme: 'hagarara' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ]);
  });

  test('should tokenize komeza (continue) keyword', () => {
    const lexer = new Lexer('komeza');
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
      { line: 1, type: TokenType.KOMEZA, lexeme: 'komeza' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ]);
  });

  test('should tokenize string literals correctly', () => {
    const lexer = new Lexer('"Hello, world!"');
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
      { type: TokenType.STRING, lexeme: 'Hello, world!', line: 1 },
      { type: TokenType.EOF, lexeme: 'EOF', line: 1 },
    ]);
  });

  test('should tokenize comments and ignore whitespace', () => {
    const lexer = new Lexer(`
      # This is a comment
      reka a = 10 # Another comment
    `);
    const tokens = lexer.tokenize();
    expect(types(tokens)).toEqual([
      { line: 3, type: TokenType.REKA, lexeme: 'reka' },
      { line: 3, type: TokenType.IDENTIFIER, lexeme: 'a' },
      { line: 3, type: TokenType.EQUAL, lexeme: '=' },
      { line: 3, type: TokenType.INTEGER, lexeme: '10' },
      { line: 4, type: TokenType.EOF, lexeme: 'EOF' },
    ]);
  });

  test('should tokenize switch case correctly', () => {
    const lexer = new Lexer(`reka y = 1
      gereranya(y){
        usanze 3:
          tangaza_amakuru("iyi ni gatatu")
        usanze 4:
          tangaza_amakuru("iyi yo ni 4")
        ibindi:
          tangaza_amakuru("iyo yo ntayo nzi pe")  
      }`);
    const tokens = lexer.tokenize();
    expect(tokens.some((t) => t.type === TokenType.GERERANYA)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.USANZE)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.IBINDI)).toBe(true);
    expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
  });

  test('should handle errors for unexpected characters', () => {
    const lexer = new Lexer('let x = ~;');
    expect(() => lexer.tokenize()).toThrowError(
      "Unexpected character '~' at line 1",
    );
  });

  test('should attach column and offsets to tokens', () => {
    const lexer = new Lexer('reka x = 1');
    const tokens = lexer.tokenize();
    const reka = tokens[0];
    expect(reka.column).toBe(1);
    expect(reka.start).toBe(0);
    expect(reka.end).toBe(4);
    const x = tokens[1];
    expect(x.column).toBe(6);
    expect(x.lexeme).toBe('x');
  });

  test('x -5 lexes as identifier, minus, number (not a negative literal)', () => {
    // Behaviour change: the lexer no longer folds '-' into the number.
    // Unary minus and subtraction are decided by the parser.
    const tokens = types(new Lexer('x -5').tokenize());
    expect(tokens).toEqual([
      { line: 1, type: TokenType.IDENTIFIER, lexeme: 'x' },
      { line: 1, type: TokenType.MINUS, lexeme: '-' },
      { line: 1, type: TokenType.INTEGER, lexeme: '5' },
      { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
    ]);
  });
});
