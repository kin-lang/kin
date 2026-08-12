import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';

describe('Parser', () => {
  test('should parse numeric and string literals in variable declaration', () => {
    const sourceCode = 'reka x = 42 reka y = "hello"';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'x',
          value: {
            kind: 'NumericLiteral',
            value: 42,
          },
        },
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'y',
          value: {
            kind: 'StringLiteral',
            value: 'hello',
          },
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse function declaration with parameters and block statement', () => {
    const sourceCode = 'porogaramu_ntoya add(a, b) { tanga a + b }';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'FunctionDeclaration',
          name: 'add',
          parameters: ['a', 'b'],
          body: [
            {
              kind: 'ReturnExpr',
              value: {
                kind: 'BinaryExpr',
                operator: '+',
                left: {
                  kind: 'Identifier',
                  symbol: 'a',
                },
                right: {
                  kind: 'Identifier',
                  symbol: 'b',
                },
              },
            },
            {
              kind: 'FunctionTerminator',
            },
          ],
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse loop statement with condition and block statement', () => {
    const sourceCode = 'subiramo_niba (i < 10) { tangaza_amakuru(i) }';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'LoopStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '<',
            left: {
              kind: 'Identifier',
              symbol: 'i',
            },
            right: {
              kind: 'NumericLiteral',
              value: 10,
            },
          },
          body: [
            {
              kind: 'CallExpression',
              caller: {
                kind: 'Identifier',
                symbol: 'tangaza_amakuru',
              },
              args: [
                {
                  kind: 'Identifier',
                  symbol: 'i',
                },
              ],
            },
          ],
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse hagarara (break) inside loop body', () => {
    const sourceCode =
      'subiramo_niba (i < 10) { niba(i == 5) { hagarara } i = i + 1 }';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'LoopStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '<',
            left: {
              kind: 'Identifier',
              symbol: 'i',
            },
            right: {
              kind: 'NumericLiteral',
              value: 10,
            },
          },
          body: [
            {
              kind: 'ConditionalStatement',
              condition: {
                kind: 'BinaryExpr',
                operator: '==',
                left: {
                  kind: 'Identifier',
                  symbol: 'i',
                },
                right: {
                  kind: 'NumericLiteral',
                  value: 5,
                },
              },
              body: [
                {
                  kind: 'BreakStatement',
                },
              ],
              alternate: [],
            },
            {
              kind: 'AssignmentExpression',
              assigne: {
                kind: 'Identifier',
                symbol: 'i',
              },
              value: {
                kind: 'BinaryExpr',
                operator: '+',
                left: {
                  kind: 'Identifier',
                  symbol: 'i',
                },
                right: {
                  kind: 'NumericLiteral',
                  value: 1,
                },
              },
            },
          ],
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse object literal with properties', () => {
    const sourceCode = 'reka obj = { key: "value", num: 42 }';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'obj',
          value: {
            kind: 'ObjectLiteral',
            properties: [
              {
                kind: 'Property',
                key: 'key',
                value: { kind: 'StringLiteral', value: 'value' },
              },
              {
                kind: 'Property',
                key: 'num',
                value: { kind: 'NumericLiteral', value: 42 },
              },
            ],
          },
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse literal with elements', () => {
    const sourceCode = 'reka arr = [1, "two", 3]';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'arr',
          value: {
            kind: 'ObjectLiteral',
            properties: [
              {
                kind: 'Property',
                key: '0',
                value: { kind: 'NumericLiteral', value: 1 },
              },
              {
                kind: 'Property',
                key: '1',
                value: { kind: 'StringLiteral', value: 'two' },
              },
              {
                kind: 'Property',
                key: '2',
                value: { kind: 'NumericLiteral', value: 3 },
              },
            ],
          },
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse complex expressions with binary operators', () => {
    const sourceCode = 'reka result = (x + y) * (z - 1)';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'result',
          value: {
            kind: 'BinaryExpr',
            operator: '*',
            left: {
              kind: 'BinaryExpr',
              operator: '+',
              left: { kind: 'Identifier', symbol: 'x' },
              right: { kind: 'Identifier', symbol: 'y' },
            },
            right: {
              kind: 'BinaryExpr',
              operator: '-',
              left: { kind: 'Identifier', symbol: 'z' },
              right: { kind: 'NumericLiteral', value: 1 },
            },
          },
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse member expression', () => {
    const sourceCode =
      'reka obj = { key_one: 1, key_two: "Key 2" } \n tanga_amakuru(obj.key_one)';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'obj',
          value: {
            kind: 'ObjectLiteral',
            properties: [
              {
                kind: 'Property',
                key: 'key_one',
                value: { kind: 'NumericLiteral', value: 1 },
              },
              {
                kind: 'Property',
                key: 'key_two',
                value: { kind: 'StringLiteral', value: 'Key 2' },
              },
            ],
          },
        },
        {
          kind: 'CallExpression',
          caller: { kind: 'Identifier', symbol: 'tanga_amakuru' },
          args: [
            {
              computed: false,
              kind: 'MemberExpression',
              object: { kind: 'Identifier', symbol: 'obj' },
              property: {
                kind: 'Identifier',
                symbol: 'key_one',
              },
            },
          ],
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse conditional statement with multiple conditions', () => {
    const sourceCode =
      'reka x = 10 \n niba (x > 5) { tangaza_amakuru("X is greater than 5") } nanone_niba (x > 5 && x < 10) { tangaza_amakuru("X is between 5 and 10") } niba_byanze { tangaza_amakuru("X might be less than 5 or greater than 10") }';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'x',
          value: { kind: 'NumericLiteral', value: 10 },
        },
        {
          kind: 'ConditionalStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '>',
            left: { kind: 'Identifier', symbol: 'x' },
            right: { kind: 'NumericLiteral', value: 5 },
          },
          body: [
            {
              kind: 'CallExpression',
              caller: { kind: 'Identifier', symbol: 'tangaza_amakuru' },
              args: [{ kind: 'StringLiteral', value: 'X is greater than 5' }],
            },
          ],
          alternate: [
            {
              kind: 'ConditionalStatement',
              condition: {
                kind: 'BinaryExpr',
                operator: '&&',
                left: {
                  kind: 'BinaryExpr',
                  operator: '>',
                  left: { kind: 'Identifier', symbol: 'x' },
                  right: { kind: 'NumericLiteral', value: 5 },
                },
                right: {
                  kind: 'BinaryExpr',
                  operator: '<',
                  left: { kind: 'Identifier', symbol: 'x' },
                  right: { kind: 'NumericLiteral', value: 10 },
                },
              },
              body: [
                {
                  kind: 'CallExpression',
                  caller: { kind: 'Identifier', symbol: 'tangaza_amakuru' },
                  args: [
                    { kind: 'StringLiteral', value: 'X is between 5 and 10' },
                  ],
                },
              ],
              alternate: [
                {
                  kind: 'CallExpression',
                  caller: { kind: 'Identifier', symbol: 'tangaza_amakuru' },
                  args: [
                    {
                      kind: 'StringLiteral',
                      value: 'X might be less than 5 or greater than 10',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should handle syntax errors correctly', () => {
    const sourceCode = 'reka x = ;';
    const parser = new Parser();
    expect(() => parser.produceAST(sourceCode)).toThrowError();
  });

  // Issue #58: nested parentheses with chained logical ops and !(expr)
  test('should parse nested parenthesized logical and comparison expression (issue #58)', () => {
    const sourceCode =
      'reka result = ((var > var2) && !(var3 != var4) || (var5 == var6))';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    const expectedAst = {
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'result',
          value: {
            kind: 'BinaryExpr',
            operator: '||',
            left: {
              kind: 'BinaryExpr',
              operator: '&&',
              left: {
                kind: 'BinaryExpr',
                operator: '>',
                left: { kind: 'Identifier', symbol: 'var' },
                right: { kind: 'Identifier', symbol: 'var2' },
              },
              right: {
                kind: 'UnaryExpr',
                operator: '!',
                operand: {
                  kind: 'BinaryExpr',
                  operator: '!=',
                  left: { kind: 'Identifier', symbol: 'var3' },
                  right: { kind: 'Identifier', symbol: 'var4' },
                },
              },
            },
            right: {
              kind: 'BinaryExpr',
              operator: '==',
              left: { kind: 'Identifier', symbol: 'var5' },
              right: { kind: 'Identifier', symbol: 'var6' },
            },
          },
        },
      ],
    };

    expect(ast).toEqual(expectedAst);
  });

  test('should parse negation of a parenthesized comparison', () => {
    const sourceCode = 'reka result = !(a == b)';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    expect(ast).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'result',
          value: {
            kind: 'UnaryExpr',
            operator: '!',
            operand: {
              kind: 'BinaryExpr',
              operator: '==',
              left: { kind: 'Identifier', symbol: 'a' },
              right: { kind: 'Identifier', symbol: 'b' },
            },
          },
        },
      ],
    });
  });

  test('should parse chained logical operators inside parentheses', () => {
    const sourceCode = 'reka result = (a && b || c)';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    expect(ast).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'result',
          value: {
            kind: 'BinaryExpr',
            operator: '||',
            left: {
              kind: 'BinaryExpr',
              operator: '&&',
              left: { kind: 'Identifier', symbol: 'a' },
              right: { kind: 'Identifier', symbol: 'b' },
            },
            right: { kind: 'Identifier', symbol: 'c' },
          },
        },
      ],
    });
  });

  test('should parse deeply nested grouped comparisons', () => {
    const sourceCode = 'reka result = (((a > b) && (c < d)))';
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);

    expect(ast).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'result',
          value: {
            kind: 'BinaryExpr',
            operator: '&&',
            left: {
              kind: 'BinaryExpr',
              operator: '>',
              left: { kind: 'Identifier', symbol: 'a' },
              right: { kind: 'Identifier', symbol: 'b' },
            },
            right: {
              kind: 'BinaryExpr',
              operator: '<',
              left: { kind: 'Identifier', symbol: 'c' },
              right: { kind: 'Identifier', symbol: 'd' },
            },
          },
        },
      ],
    });
  });
});
