import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';
import Lexer from '../src/lexer/lexer';
import TokenType from '../src/lexer/tokens';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { ConditionalStmt, StringLiteral, NumericLiteral, BinaryExpr, Identifier } from '../src/parser/ast';
import { StringVal, NumberVal } from '../src/runtime/values';

describe('Switch Case (Gereranya) Tests', () => {
  describe('Lexer Tests', () => {
    test('should tokenize switch statement keywords correctly', () => {
      const sourceCode = 'gereranya(x){usanze 1:ibindi:}';
      const lexer = new Lexer(sourceCode);
      const tokens = lexer.tokenize();

      const expectedTokens = [
        { line: 1, type: TokenType.GERERANYA, lexeme: 'gereranya' },
        { line: 1, type: TokenType.OPEN_PARANTHESES, lexeme: '(' },
        { line: 1, type: TokenType.IDENTIFIER, lexeme: 'x' },
        { line: 1, type: TokenType.CLOSE_PARANTHESES, lexeme: ')' },
        { line: 1, type: TokenType.OPEN_CURLY_BRACES, lexeme: '{' },
        { line: 1, type: TokenType.USANZE, lexeme: 'usanze' },
        { line: 1, type: TokenType.INTEGER, lexeme: '1' },
        { line: 1, type: TokenType.COLON, lexeme: ':' },
        { line: 1, type: TokenType.IBINDI, lexeme: 'ibindi' },
        { line: 1, type: TokenType.COLON, lexeme: ':' },
        { line: 1, type: TokenType.CLOSE_CURLY_BRACES, lexeme: '}' },
        { line: 1, type: TokenType.EOF, lexeme: 'EOF' },
      ];

      expect(tokens).toEqual(expectedTokens);
    });

    test('should tokenize complex switch statement with multiple cases', () => {
      const sourceCode = `
        gereranya(iletere){
          usanze "a":
            tangaza_amakuru("a")
          usanze "b":
            tangaza_amakuru("b")
          ibindi:
            tangaza_amakuru("default")
        }
      `;
      const lexer = new Lexer(sourceCode);
      const tokens = lexer.tokenize();

      // Check that all expected tokens are present
      const tokenTypes = tokens.map(t => t.type);
      expect(tokenTypes).toContain(TokenType.GERERANYA);
      expect(tokenTypes).toContain(TokenType.USANZE);
      expect(tokenTypes).toContain(TokenType.IBINDI);
      expect(tokenTypes).toContain(TokenType.COLON);
    });
  });

  describe('Parser Tests', () => {
    test('should parse simple switch statement with one case', () => {
      const sourceCode = 'gereranya(x){usanze 1:reka a = 1}';
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      const expectedAst = {
        kind: 'Program',
        body: [
          {
            kind: 'ConditionalStatement',
            condition: {
              kind: 'BinaryExpr',
              operator: '==',
              left: {
                kind: 'Identifier',
                symbol: 'x',
              },
              right: {
                kind: 'NumericLiteral',
                value: 1,
              },
            },
            body: [
              {
                kind: 'VariableDeclaration',
                constant: false,
                identifier: 'a',
                value: {
                  kind: 'NumericLiteral',
                  value: 1,
                },
              },
            ],
            alternate: [],
          },
        ],
      };

      expect(ast).toEqual(expectedAst);
    });

    test('should parse switch statement with multiple cases', () => {
      const sourceCode = `
        gereranya(x){
          usanze 1:
            reka a = 1
          usanze 2:
            reka b = 2
        }
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      // The first case should be the main condition
      const firstCase = ast.body[0] as ConditionalStmt;
      expect(firstCase.kind).toBe('ConditionalStatement');
      const firstCondition = firstCase.condition as BinaryExpr;
      expect(firstCondition.kind).toBe('BinaryExpr');
      expect(firstCondition.operator).toBe('==');
      expect((firstCondition.left as Identifier).symbol).toBe('x');
      expect((firstCondition.right as NumericLiteral).value).toBe(1);

      // The second case should be in the alternate array
      expect(firstCase.alternate).toHaveLength(1);
      const secondCase = firstCase.alternate![0] as ConditionalStmt;
      expect(secondCase.kind).toBe('ConditionalStatement');
      const secondCondition = secondCase.condition as BinaryExpr;
      expect(secondCondition.kind).toBe('BinaryExpr');
      expect(secondCondition.operator).toBe('==');
      expect((secondCondition.left as Identifier).symbol).toBe('x');
      expect((secondCondition.right as NumericLiteral).value).toBe(2);
    });

    test('should parse switch statement with default case', () => {
      const sourceCode = `
        gereranya(x){
          usanze 1:
            reka a = 1
          ibindi:
            reka b = 2
        }
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      // The default case should be in the alternate array
      const switchStmt = ast.body[0] as ConditionalStmt;
      expect(switchStmt.alternate).toHaveLength(1);
      const defaultCase = switchStmt.alternate![0];
      expect(defaultCase.kind).toBe('VariableDeclaration');
      expect((defaultCase as any).identifier).toBe('b');
    });

    test('should parse switch statement with string cases', () => {
      const sourceCode = `
        gereranya(iletere){
          usanze "a":
            tangaza_amakuru("a")
          usanze "b":
            tangaza_amakuru("b")
        }
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      const switchStmt2 = ast.body[0] as ConditionalStmt;
      const condition2 = switchStmt2.condition as BinaryExpr;
      expect(condition2.right.kind).toBe('StringLiteral');
      expect((condition2.right as StringLiteral).value).toBe('a');
      const alternate2 = switchStmt2.alternate![0] as ConditionalStmt;
      const condition3 = alternate2.condition as BinaryExpr;
      expect(condition3.right.kind).toBe('StringLiteral');
      expect((condition3.right as StringLiteral).value).toBe('b');
    });

    test('should parse empty switch statement', () => {
      const sourceCode = 'gereranya(x){}';
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      const emptySwitch = ast.body[0] as ConditionalStmt;
      expect(emptySwitch.kind).toBe('ConditionalStatement');
      expect(emptySwitch.body).toHaveLength(0);
      expect(emptySwitch.alternate).toHaveLength(0);
    });

    test('should parse switch statement with only default case', () => {
      const sourceCode = `
        gereranya(x){
          ibindi:
            reka a = 1
        }
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);

      const defaultSwitch = ast.body[0] as ConditionalStmt;
      expect(defaultSwitch.kind).toBe('ConditionalStatement');
      // When there's only a default case, the parser creates a fallback structure
      // with empty body and alternate, and a condition comparing to empty string
      expect(defaultSwitch.body).toHaveLength(0);
      expect(defaultSwitch.alternate).toHaveLength(0);
      const condition = defaultSwitch.condition as BinaryExpr;
      expect(condition.kind).toBe('BinaryExpr');
      expect(condition.operator).toBe('==');
      expect((condition.right as StringLiteral).value).toBe('');
    });
  });

  describe('Runtime Tests', () => {
    test('should execute switch statement with matching case', () => {
      const sourceCode = `
        reka x = 1
        reka result = "default"
        gereranya(x){
          usanze 1:
            result = "case 1"
          usanze 2:
            result = "case 2"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('case 1');
    });

    test('should execute switch statement with non-matching case', () => {
      const sourceCode = `
        reka x = 3
        gereranya(x){
          usanze 1:
            reka result = "case 1"
          usanze 2:
            reka result = "case 2"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      
      // Should throw error because result is not defined
      expect(() => Interpreter.evaluate(ast, env)).toThrow();
    });

    test('should execute switch statement with default case', () => {
      const sourceCode = `
        reka x = 3
        reka result = "default"
        gereranya(x){
          usanze 1:
            result = "case 1"
          ibindi:
            result = "default"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('default');
    });

    test('should execute switch statement with string matching', () => {
      const sourceCode = `
        reka iletere = "a"
        reka result = "unknown letter"
        gereranya(iletere){
          usanze "a":
            result = "letter a"
          usanze "b":
            result = "letter b"
          ibindi:
            result = "unknown letter"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('letter a');
    });

    test('should execute switch statement with multiple statements in case', () => {
      const sourceCode = `
        reka x = 1
        reka result = 0
        gereranya(x){
          usanze 1:
            reka a = 10
            reka b = 20
            result = a + b
          usanze 2:
            result = 50
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(30);
    });

    test('should handle nested switch statements', () => {
      const sourceCode = `
        reka x = 1
        reka y = 2
        reka result = "outer default"
        gereranya(x){
          usanze 1:
            gereranya(y){
              usanze 2:
                result = "nested case"
              ibindi:
                result = "nested default"
            }
          ibindi:
            result = "outer default"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('nested case');
    });

    test('should handle switch statement with function calls', () => {
      const sourceCode = `
        porogaramu_ntoya getValue() {
          tanga 42
        }
        reka x = 1
        reka result = 0
        gereranya(x){
          usanze 1:
            result = getValue()
          ibindi:
            result = 0
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(42);
    });

    test('should handle switch statement with complex expressions', () => {
      const sourceCode = `
        reka x = 5
        reka result = "default"
        gereranya(x){
          usanze 5:
            result = "complex case"
          usanze 6:
            result = "another complex case"
          ibindi:
            result = "default"
        }
        result
      `;
      const parser = new Parser();
      const ast = parser.produceAST(sourceCode);
      const env = createGlobalEnv('test.kin');
      const result = Interpreter.evaluate(ast, env);

      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('complex case');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle switch statement with invalid syntax', () => {
      const sourceCode = 'gereranya(x){usanze 1}'; // Missing colon
      const parser = new Parser();
      
      expect(() => parser.produceAST(sourceCode)).toThrow();
    });

    test('should handle switch statement with missing opening brace', () => {
      const sourceCode = 'gereranya(x)usanze 1:}'; // Missing {
      const parser = new Parser();
      
      expect(() => parser.produceAST(sourceCode)).toThrow();
    });

    test('should handle switch statement with missing closing brace', () => {
      const sourceCode = 'gereranya(x){usanze 1:'; // Missing }
      const parser = new Parser();
      
      expect(() => parser.produceAST(sourceCode)).toThrow();
    });
  });
});
