import { describe, test, expect } from 'vitest';
import TokenType from '../src/lexer/tokens';
import Lexer from '../src/lexer/lexer';
import { KinTypeError } from '../src/lib/errors';
import {
  asNumber,
  asString,
  evaluate,
  expectKinError,
  expectThrownKinError,
} from './helpers';

describe('Type system — lexer', () => {
  test('tokenizes ubwoko keyword, pipe, and question mark', () => {
    const tokens = new Lexer(
      'ubwoko Person = { name: ijambo } reka x: umubare? = ubusa a | b',
    ).tokenize();
    const kinds = tokens.map((t) => t.type);
    expect(kinds).toContain(TokenType.UBWOKO);
    expect(kinds).toContain(TokenType.PIPE);
    expect(kinds).toContain(TokenType.QUESTION);
    expect(kinds).toContain(TokenType.COLON);
  });
});

describe('Type system — runtime checks', () => {
  test('accepts matching primitive annotations', () => {
    const { env } = evaluate(`
      reka age: umubare = 25
      reka name: ijambo = "Keza"
      reka ok: ukuri = nibyo
      reka list: urutonde = [1, 2]
    `);
    expect(asNumber(env.lookupVar('age'))).toBe(25);
    expect(asString(env.lookupVar('name'))).toBe('Keza');
  });

  test('rejects umubare assigned to ijambo', () => {
    const err = expectKinError('reka name: ijambo = 42', 'K035');
    expect(err).toBeInstanceOf(KinTypeError);
    expect(err.message).toMatch(/Cannot assign a umubare to a ijambo/i);
  });

  test('rejects reassignment that breaks annotation', () => {
    expectKinError(
      `
      reka name: ijambo = "Keza"
      name = 10
    `,
      'K035',
    );
  });

  test('optional type accepts ubusa', () => {
    const { env } = evaluate('reka maybe: umubare? = ubusa');
    expect(env.lookupVar('maybe').type).toBe('null');
  });

  test('required type rejects ubusa', () => {
    expectKinError('reka score: umubare = ubusa', 'K035');
  });

  test('union type accepts either member', () => {
    const { env } = evaluate(`
      ubwoko Id = ijambo | umubare
      reka a: Id = "x"
      reka b: Id = 7
    `);
    expect(asString(env.lookupVar('a'))).toBe('x');
    expect(asNumber(env.lookupVar('b'))).toBe(7);
  });

  test('union type rejects other types', () => {
    expectKinError(
      `
      ubwoko Id = ijambo | umubare
      reka a: Id = nibyo
    `,
      'K035',
    );
  });

  test('object type with nested type chaining', () => {
    const { env } = evaluate(`
      ubwoko Address = { city: ijambo, street: ijambo }
      ubwoko Person = { name: ijambo, address: Address }
      reka p: Person = {
        name: "Keza",
        address: { city: "Kigali", street: "KG 1" }
      }
    `);
    expect(env.lookupVar('p').type).toBe('object');
  });

  test('object type rejects missing property', () => {
    expectKinError(
      `
      ubwoko Person = { name: ijambo, age: umubare }
      reka p: Person = { name: "Keza" }
    `,
      'K035',
    );
  });

  test('object type rejects wrong nested type', () => {
    expectKinError(
      `
      ubwoko Address = { city: ijambo }
      ubwoko Person = { address: Address }
      reka p: Person = { address: { city: 1 } }
    `,
      'K035',
    );
  });

  test('Fata keeps only selected keys', () => {
    const { env } = evaluate(`
      ubwoko Person = { name: ijambo, age: umubare, city: ijambo }
      ubwoko NameOnly = Fata<Person, "name">
      reka n: NameOnly = { name: "Keza" }
    `);
    expect(env.lookupVar('n').type).toBe('object');
  });

  test('Fata with multiple keys', () => {
    evaluate(`
      ubwoko Person = { name: ijambo, age: umubare, city: ijambo }
      ubwoko NameAge = Fata<Person, "name" | "age">
      reka n: NameAge = { name: "Keza", age: 20 }
    `);
  });

  test('Fata rejects missing key on source type', () => {
    expectThrownKinError(
      () =>
        evaluate(`
          ubwoko Person = { name: ijambo }
          ubwoko Bad = Fata<Person, "age">
        `),
      KinTypeError,
      { code: 'K034' },
    );
  });

  test('typed function parameters are checked at call time', () => {
    expectKinError(
      `
      porogaramu_ntoya add(a: umubare, b: umubare): umubare {
        tanga a + b
      }
      add("1", 2)
    `,
      'K035',
    );
  });

  test('typed function return value is checked', () => {
    expectKinError(
      `
      porogaramu_ntoya bad(): umubare {
        tanga "nope"
      }
      bad()
    `,
      'K035',
    );
  });

  test('typed function happy path', () => {
    const { result } = evaluate(`
      porogaramu_ntoya add(a: umubare, b: umubare): umubare {
        tanga a + b
      }
      add(2, 3)
    `);
    expect(asNumber(result)).toBe(5);
  });

  test('porogaramu_ntoya annotation accepts functions', () => {
    evaluate(`
      porogaramu_ntoya add(a: umubare, b: umubare): umubare {
        tanga a + b
      }
      reka f: porogaramu_ntoya = add
      reka print: _porogaramu_ntoya = tangaza_amakuru
    `);
  });

  test('ubwoko() still reports runtime type names in Kinyarwanda', () => {
    const { result } = evaluate('ubwoko(5)');
    expect(asString(result)).toBe('umubare');
  });

  test('ubwoko as type keyword and as function coexist', () => {
    const { result } = evaluate(`
      ubwoko Id = umubare
      reka x: Id = 3
      ubwoko(x)
    `);
    expect(asString(result)).toBe('umubare');
  });

  test('unknown type name is an error', () => {
    expectKinError('reka x: DoesNotExist = 1', 'K033');
  });

  test('duplicate type alias is an error', () => {
    expectKinError(
      `
      ubwoko A = umubare
      ubwoko A = ijambo
    `,
      'K036',
    );
  });

  test('unannotated variables stay dynamic', () => {
    const { env } = evaluate(`
      reka x = 1
      x = "now a string"
    `);
    expect(asString(env.lookupVar('x'))).toBe('now a string');
  });
});
