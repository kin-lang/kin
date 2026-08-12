import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';

/** Drop span fields so structural AST tests stay readable. */
function stripSpans(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripSpans);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'span') continue;
      out[k] = stripSpans(v);
    }
    return out;
  }
  return node;
}

function parse(source: string) {
  return stripSpans(new Parser().produceAST(source));
}

describe('Parser', () => {
  test('should parse numeric and string literals in variable declaration', () => {
    expect(parse('reka x = 42 reka y = "hello"')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'x',
          value: { kind: 'NumericLiteral', value: 42 },
        },
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'y',
          value: { kind: 'StringLiteral', value: 'hello' },
        },
      ],
    });
  });

  test('should parse function declaration with parameters and block statement', () => {
    expect(parse('porogaramu_ntoya add(a, b) { tanga a + b }')).toEqual({
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
                left: { kind: 'Identifier', symbol: 'a' },
                right: { kind: 'Identifier', symbol: 'b' },
              },
            },
          ],
        },
      ],
    });
  });

  test('should parse loop statement with condition and block statement', () => {
    expect(parse('subiramo_niba (i < 10) { tangaza_amakuru(i) }')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'LoopStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '<',
            left: { kind: 'Identifier', symbol: 'i' },
            right: { kind: 'NumericLiteral', value: 10 },
          },
          body: [
            {
              kind: 'CallExpression',
              caller: { kind: 'Identifier', symbol: 'tangaza_amakuru' },
              args: [{ kind: 'Identifier', symbol: 'i' }],
            },
          ],
        },
      ],
    });
  });

  test('should parse hagarara (break) inside loop body', () => {
    expect(
      parse('subiramo_niba (i < 10) { niba(i == 5) { hagarara } i = i + 1 }'),
    ).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'LoopStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '<',
            left: { kind: 'Identifier', symbol: 'i' },
            right: { kind: 'NumericLiteral', value: 10 },
          },
          body: [
            {
              kind: 'ConditionalStatement',
              condition: {
                kind: 'BinaryExpr',
                operator: '==',
                left: { kind: 'Identifier', symbol: 'i' },
                right: { kind: 'NumericLiteral', value: 5 },
              },
              body: [{ kind: 'BreakStatement' }],
              alternate: [],
            },
            {
              kind: 'AssignmentExpression',
              assigne: { kind: 'Identifier', symbol: 'i' },
              value: {
                kind: 'BinaryExpr',
                operator: '+',
                left: { kind: 'Identifier', symbol: 'i' },
                right: { kind: 'NumericLiteral', value: 1 },
              },
            },
          ],
        },
      ],
    });
  });

  test('should parse komeza (continue) inside loop body', () => {
    expect(
      parse('subiramo_niba (i < 10) { niba(i == 5) { komeza } i = i + 1 }'),
    ).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'LoopStatement',
          condition: {
            kind: 'BinaryExpr',
            operator: '<',
            left: { kind: 'Identifier', symbol: 'i' },
            right: { kind: 'NumericLiteral', value: 10 },
          },
          body: [
            {
              kind: 'ConditionalStatement',
              condition: {
                kind: 'BinaryExpr',
                operator: '==',
                left: { kind: 'Identifier', symbol: 'i' },
                right: { kind: 'NumericLiteral', value: 5 },
              },
              body: [{ kind: 'ContinueStatement' }],
              alternate: [],
            },
            {
              kind: 'AssignmentExpression',
              assigne: { kind: 'Identifier', symbol: 'i' },
              value: {
                kind: 'BinaryExpr',
                operator: '+',
                left: { kind: 'Identifier', symbol: 'i' },
                right: { kind: 'NumericLiteral', value: 1 },
              },
            },
          ],
        },
      ],
    });
  });

  test('should reject komeza (continue) outside a loop', () => {
    const parser = new Parser();
    expect(() => parser.produceAST('komeza')).toThrowError(
      'komeza can only be used inside a loop',
    );
  });

  test('should reject komeza (continue) inside a function even when the function is nested in a loop', () => {
    const parser = new Parser();
    expect(() =>
      parser.produceAST(
        'subiramo_niba (nibyo) { porogaramu_ntoya foo() { komeza } }',
      ),
    ).toThrowError('komeza can only be used inside a loop');
  });

  test('should parse object literal with properties', () => {
    expect(parse('reka obj = { key: "value", num: 42 }')).toEqual({
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
    });
  });

  test('should parse array literal with elements', () => {
    expect(parse('reka arr = [1, "two", 3]')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'arr',
          value: {
            kind: 'ArrayLiteral',
            elements: [
              { kind: 'NumericLiteral', value: 1 },
              { kind: 'StringLiteral', value: 'two' },
              { kind: 'NumericLiteral', value: 3 },
            ],
          },
        },
      ],
    });
  });

  test('should parse complex expressions with binary operators', () => {
    expect(parse('reka result = (x + y) * (z - 1)')).toEqual({
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
    });
  });

  test('should parse member expression', () => {
    expect(
      parse(
        'reka obj = { key_one: 1, key_two: "Key 2" } \n tanga_amakuru(obj.key_one)',
      ),
    ).toEqual({
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
              property: { kind: 'Identifier', symbol: 'key_one' },
            },
          ],
        },
      ],
    });
  });

  test('should parse conditional statement with multiple conditions', () => {
    expect(
      parse(
        'reka x = 10 \n niba (x > 5) { tangaza_amakuru("X is greater than 5") } nanone_niba (x > 5 && x < 10) { tangaza_amakuru("X is between 5 and 10") } niba_byanze { tangaza_amakuru("X might be less than 5 or greater than 10") }',
      ),
    ).toEqual({
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
    });
  });

  test('should handle syntax errors correctly', () => {
    const parser = new Parser();
    expect(() => parser.produceAST('reka x = ;')).toThrowError();
  });

  test('should parse nested parenthesized logical and comparison expression (issue #58)', () => {
    expect(
      parse(
        'reka result = ((var > var2) && !(var3 != var4) || (var5 == var6))',
      ),
    ).toEqual({
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
    });
  });

  test('should parse negation of a parenthesized comparison', () => {
    expect(parse('reka result = !(a == b)')).toEqual({
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
    expect(parse('reka result = (a && b || c)')).toEqual({
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
    expect(parse('reka result = (((a > b) && (c < d)))')).toEqual({
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

  test('should parse unary minus and exponentiation', () => {
    expect(parse('reka y = -x')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'y',
          value: {
            kind: 'UnaryExpr',
            operator: '-',
            operand: { kind: 'Identifier', symbol: 'x' },
          },
        },
      ],
    });

    expect(parse('reka r = 2 ^ 3 ^ 2')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'VariableDeclaration',
          constant: false,
          identifier: 'r',
          value: {
            kind: 'BinaryExpr',
            operator: '^',
            left: { kind: 'NumericLiteral', value: 2 },
            right: {
              kind: 'BinaryExpr',
              operator: '^',
              left: { kind: 'NumericLiteral', value: 3 },
              right: { kind: 'NumericLiteral', value: 2 },
            },
          },
        },
      ],
    });
  });

  test('should parse indexing of array literals', () => {
    expect(parse('[1, 2, 3][0]')).toEqual({
      kind: 'Program',
      body: [
        {
          kind: 'MemberExpression',
          computed: true,
          object: {
            kind: 'ArrayLiteral',
            elements: [
              { kind: 'NumericLiteral', value: 1 },
              { kind: 'NumericLiteral', value: 2 },
              { kind: 'NumericLiteral', value: 3 },
            ],
          },
          property: { kind: 'NumericLiteral', value: 0 },
        },
      ],
    });
  });
});
