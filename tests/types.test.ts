import { describe, test, expect, afterEach } from 'vitest';
import Lexer from '../src/lexer/lexer';
import Parser from '../src/parser/parser';
import TokenType from '../src/lexer/tokens';
import {
  asNumber,
  asString,
  evaluate,
  expectKinError,
} from './helpers';
import { KinSyntaxError, KinTypeError } from '../src/lib/errors';
import {
  parseTypeSafetyDirective,
  resolveTypeSafetyMode,
} from '../src/runtime/types';
import { applyTypeSafetyToEnv, runSource } from '../src/runtime/run';
import { createGlobalEnv } from '../src/runtime/globals';
import { Interpreter } from '../src/runtime/interpreter';

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

function parse(source: string, typeSafety?: string) {
  const parser = new Parser();
  if (typeSafety !== undefined) parser.setTypeSafetyOverride(typeSafety);
  return stripSpans(parser.produceAST(source));
}

describe('Variable type annotations', () => {
  const prevKinTypes = process.env.KIN_TYPES;
  afterEach(() => {
    if (prevKinTypes === undefined) delete process.env.KIN_TYPES;
    else process.env.KIN_TYPES = prevKinTypes;
  });

  describe('lexer', () => {
    test('tokenizes ? as QUESTION', () => {
      const tokens = new Lexer('reka x: number? = 1').tokenize();
      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.COLON);
      expect(types).toContain(TokenType.QUESTION);
      expect(tokens.find((t) => t.type === TokenType.QUESTION)?.lexeme).toBe(
        '?',
      );
    });
  });

  describe('parser', () => {
    test('parses required type annotation', () => {
      expect(parse('reka age: number = 25')).toEqual({
        kind: 'Program',
        body: [
          {
            kind: 'VariableDeclaration',
            constant: false,
            identifier: 'age',
            typeAnnotation: { name: 'number', optional: false },
            value: { kind: 'NumericLiteral', value: 25 },
          },
        ],
      });
    });

    test('parses optional type annotation', () => {
      expect(parse('reka score: number? = ubusa')).toEqual({
        kind: 'Program',
        body: [
          {
            kind: 'VariableDeclaration',
            constant: false,
            identifier: 'score',
            typeAnnotation: { name: 'number', optional: true },
            value: { kind: 'Identifier', symbol: 'ubusa' },
          },
        ],
      });
    });

    test('parses optional type with omitted initializer', () => {
      expect(parse('reka maybe: string?;')).toEqual({
        kind: 'Program',
        body: [
          {
            kind: 'VariableDeclaration',
            constant: false,
            identifier: 'maybe',
            typeAnnotation: { name: 'string', optional: true },
            value: undefined,
          },
        ],
      });
    });

    test('parses typed constant', () => {
      expect(parse('ntahinduka name: string = "Keza"')).toEqual({
        kind: 'Program',
        body: [
          {
            kind: 'VariableDeclaration',
            constant: true,
            identifier: 'name',
            typeAnnotation: { name: 'string', optional: false },
            value: { kind: 'StringLiteral', value: 'Keza' },
          },
        ],
      });
    });

    test('accepts native-fn as a synonym of fn', () => {
      expect(parse('reka f: native-fn = tangaza_amakuru')).toEqual({
        kind: 'Program',
        body: [
          {
            kind: 'VariableDeclaration',
            constant: false,
            identifier: 'f',
            typeAnnotation: { name: 'native-fn', optional: false },
            value: { kind: 'Identifier', symbol: 'tangaza_amakuru' },
          },
        ],
      });
    });

    test('rejects unknown type name (K032)', () => {
      try {
        new Parser().produceAST('reka x: foo = 1');
        throw new Error('expected throw');
      } catch (e) {
        expect((e as { code?: string }).code).toBe('K032');
      }
    });

    test('unannotated declaration omits typeAnnotation field', () => {
      const ast = parse('reka x = 1') as {
        body: Array<Record<string, unknown>>;
      };
      expect(ast.body[0]).not.toHaveProperty('typeAnnotation');
    });

    test('strict mode rejects untyped reka at parse time (K035)', () => {
      try {
        parse('reka x = 1', 'strict');
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(KinSyntaxError);
        expect((e as { code?: string }).code).toBe('K035');
      }
    });
  });

  describe('type-safety modes', () => {
    test('parses # kin-types directive (last wins)', () => {
      expect(parseTypeSafetyDirective('# kin-types: off\nreka x = 1')).toBe(
        'off',
      );
      expect(
        parseTypeSafetyDirective(
          '# kin-types: on\n# kin-types: strict\nreka x: number = 1',
        ),
      ).toBe('strict');
    });

    test('resolveTypeSafetyMode precedence: override > file > env > on', () => {
      process.env.KIN_TYPES = 'strict';
      expect(resolveTypeSafetyMode('reka x = 1')).toBe('strict');
      expect(resolveTypeSafetyMode('# kin-types: off\nreka x = 1')).toBe(
        'off',
      );
      expect(
        resolveTypeSafetyMode('# kin-types: off\nreka x = 1', 'on'),
      ).toBe('on');
      delete process.env.KIN_TYPES;
      expect(resolveTypeSafetyMode('reka x = 1')).toBe('on');
    });

    test('off mode ignores annotations (no type check)', () => {
      const { env } = evaluate(
        `
        # kin-types: off
        reka x: number = "not a number"
        x = {a: 1}
      `,
      );
      expect(env.lookupVar('x').type).toBe('object');
      expect(env.lookupType('x')).toBeUndefined();
      expect(env.getTypeSafety()).toBe('off');
    });

    test('strict mode accepts fully typed program', () => {
      const { env } = evaluate(
        `
        # kin-types: strict
        reka n: number = 1
        reka s: string? = ubusa
      `,
      );
      expect(asNumber(env.lookupVar('n'))).toBe(1);
      expect(env.getTypeSafety()).toBe('strict');
    });

    test('CLI-style override forces strict over file off', () => {
      expect(() =>
        evaluate('# kin-types: off\nreka x = 1', 'test.kin', {
          typeSafety: 'strict',
        }),
      ).toThrow();
    });
  });

  describe('runtime', () => {
    test('required type accepts matching value', () => {
      const { env } = evaluate('reka age: number = 30');
      expect(asNumber(env.lookupVar('age'))).toBe(30);
      expect(env.lookupType('age')).toEqual({
        name: 'number',
        optional: false,
      });
    });

    test('optional type accepts ubusa and a real value', () => {
      const { env } = evaluate(`
        reka a: number? = ubusa
        reka b: string? = "hi"
        reka c: boolean?;
      `);
      expect(env.lookupVar('a').type).toBe('null');
      expect(asString(env.lookupVar('b'))).toBe('hi');
      expect(env.lookupVar('c').type).toBe('null');
      expect(env.lookupType('c')?.optional).toBe(true);
    });

    test('required type rejects ubusa on declare (K034)', () => {
      const err = expectKinError('reka x: number;', 'K034');
      expect(err).toBeInstanceOf(KinTypeError);
      expect(err.ERRCODE).toBe('E_TYPE');
    });

    test('required type rejects explicit ubusa initializer (K034)', () => {
      expectKinError('reka x: number = ubusa', 'K034');
    });

    test('required type rejects wrong type on declare (K033)', () => {
      const err = expectKinError('reka x: number = "nope"', 'K033');
      expect(err).toBeInstanceOf(KinTypeError);
      expect(err.params.expected).toBe('number');
      expect(err.params.got).toBe('string');
    });

    test('K033 for optional type reports base type name without ?', () => {
      const err = expectKinError('reka x: number? = "a"', 'K033');
      expect(err.params.expected).toBe('number');
      expect(err.message).not.toMatch(/number\?/);
    });

    test('reassignment is checked against the annotation', () => {
      expectKinError(
        `
        reka x: number = 1
        x = "string"
      `,
        'K033',
      );

      expectKinError(
        `
        reka x: number = 1
        x = ubusa
      `,
        'K034',
      );

      const { env } = evaluate(`
        reka x: number? = 1
        x = ubusa
        reka y: number = 5
        y = 10
      `);
      expect(env.lookupVar('x').type).toBe('null');
      expect(asNumber(env.lookupVar('y'))).toBe(10);
    });

    test('reassignment inside niba is still type-checked', () => {
      expectKinError(
        `
        reka x: number = 1
        niba (nibyo) {
          x = "bad"
        }
      `,
        'K033',
      );
    });

    test('optional type still rejects wrong non-null type', () => {
      expectKinError(
        `
        reka x: number? = 1
        x = "no"
      `,
        'K033',
      );
    });

    test('ntahinduka wrong type fails (K033)', () => {
      expectKinError('ntahinduka x: number = "no"', 'K033');
    });

    test('unannotated variables remain dynamic', () => {
      const { env } = evaluate(`
        reka x = 1
        x = "now a string"
      `);
      expect(asString(env.lookupVar('x'))).toBe('now a string');
      expect(env.lookupType('x')).toBeUndefined();
    });

    test('supports urutonde, object, boolean, and fn', () => {
      const { env } = evaluate(`
        reka list: urutonde = [1, 2]
        reka bag: object = {a: 1}
        reka ok: boolean = nibyo
        porogaramu_ntoya add(a, b) { tanga a + b }
        reka f: fn = add
      `);
      expect(env.lookupVar('list').type).toBe('array');
      expect(env.lookupVar('bag').type).toBe('object');
      expect(env.lookupVar('ok').type).toBe('boolean');
      expect(env.lookupVar('f').type).toBe('fn');
    });

    test('fn annotation accepts native functions; got maps natives to fn', () => {
      const { env } = evaluate('reka print: fn = tangaza_amakuru');
      expect(env.lookupVar('print').type).toBe('native-fn');

      // Wrong type: native assigned to number — got is annotation vocab "fn"
      const err = expectKinError(
        'reka n: number = tangaza_amakuru',
        'K033',
      );
      expect(err.params.got).toBe('fn');
    });

    test('native-fn annotation accepts native functions', () => {
      const { env } = evaluate('reka print: native-fn = tangaza_amakuru');
      expect(env.lookupVar('print').type).toBe('native-fn');
    });

    test('all built-in type names work as required types', () => {
      evaluate(`
        reka n: number = 1
        reka s: string = "a"
        reka b: boolean = sibyo
        reka o: object = {}
        reka u: urutonde = []
        reka f: fn = tangaza_amakuru
        reka g: native-fn = tangaza_amakuru
      `);
    });

    test('object literal colon coexists with type annotation', () => {
      const { env } = evaluate(
        'reka person: object = {izina: "Keza", imyaka: 20}',
      );
      expect(env.lookupVar('person').type).toBe('object');
    });
  });
});

describe('runSource / env mode alignment', () => {
  const prev = process.env.KIN_TYPES;
  afterEach(() => {
    if (prev === undefined) delete process.env.KIN_TYPES;
    else process.env.KIN_TYPES = prev;
  });

  test('runSource applies file # kin-types: off to env automatically', () => {
    const { env, typeSafety } = runSource(`
      # kin-types: off
      reka x: number = "not a number"
    `);
    expect(typeSafety).toBe('off');
    expect(env.getTypeSafety()).toBe('off');
    expect(env.lookupVar('x').type).toBe('string');
  });

  test('createGlobalEnv honors KIN_TYPES=off when options omitted', () => {
    process.env.KIN_TYPES = 'off';
    const env = createGlobalEnv('t.kin');
    expect(env.getTypeSafety()).toBe('off');
  });

  test('REPL-style applyTypeSafetyToEnv updates existing env', () => {
    delete process.env.KIN_TYPES;
    const env = createGlobalEnv('repl');
    expect(env.getTypeSafety()).toBe('on');

    const parser = new Parser();
    const parsed = parser.parse(`
      # kin-types: off
      reka x: number = "ok when off"
    `);
    applyTypeSafetyToEnv(env, parsed.typeSafety);
    expect(env.getTypeSafety()).toBe('off');
    Interpreter.evaluate(parsed.program, env);
    expect(env.lookupVar('x').type).toBe('string');
  });
});
