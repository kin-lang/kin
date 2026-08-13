import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import * as log from '../src/lib/log';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import {
  asBool,
  asNumber,
  asString,
  evaluate,
  expectKinError,
} from './helpers';
import { ClassVal, InstanceVal, TypeVal } from '../src/runtime/values';

const OOP_DIR = path.join(process.cwd(), 'examples', 'oop');

function runOop(filename: string): void {
  const filePath = path.join(OOP_DIR, filename);
  const source = readFileSync(filePath, 'utf-8');
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const env = createGlobalEnv(filePath);
  Interpreter.evaluate(ast, env);
}

describe('OOP examples', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const files = readdirSync(OOP_DIR)
    .filter((f) => f.endsWith('.kin'))
    .sort();

  test('discovers all oop samples', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'class-basics.kin',
        'visibility.kin',
        'inheritance.kin',
        'instances-and-binding.kin',
        'types-and-ubwoko.kin',
      ]),
    );
  });

  test.each(files)('runs examples/oop/%s without throwing', (filename) => {
    expect(() => runOop(filename)).not.toThrow();
  });
});

describe('OOP runtime behavior', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('class basics: construct, methods, fields', () => {
    const { env } = evaluate(`
      imiterere Umuntu {
        tegura(izina, imyaka) {
          rusange _.izina = izina
          rusange _.imyaka = imyaka
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      reka keza = rema Umuntu("Keza", 20)
    `);
    const keza = env.lookupVar('keza') as InstanceVal;
    expect(keza.type).toBe('instance');
    expect(keza.klass.name).toBe('Umuntu');
    expect(asString(keza.fields.get('izina')!)).toBe('Keza');
    expect(asNumber(keza.fields.get('imyaka')!)).toBe(20);
  });

  test('private field is not readable from outside', () => {
    expectKinError(
      `
      imiterere Umuntu {
        tegura(izina) {
          bwite _.izina = izina
        }
      }
      reka k = rema Umuntu("K")
      tangaza_amakuru(k.izina)
    `,
      'K041',
    );
  });

  test('bound method keeps receiver', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya get() {
          tanga _.izina
        }
      }
      reka k = rema Umuntu("Keza")
      reka f = k.get
      f()
    `);
    expect(asString(result)).toBe('Keza');
  });

  test('inheritance: method override and inherited constructor', () => {
    const { env } = evaluate(`
      imiterere Umuntu {
        tegura(izina, imyaka) {
          rusange _.izina = izina
          rusange _.imyaka = imyaka
        }
        rusange porogaramu_ntoya imyaka_yose() {
          tanga _.imyaka
        }
      }
      imiterere Umwarimu ikomoka Umuntu {
        rusange porogaramu_ntoya yigisha() {
          tanga "ok"
        }
      }
      reka m = rema Umwarimu("Keza", 28)
    `);
    const m = env.lookupVar('m') as InstanceVal;
    expect(m.klass.name).toBe('Umwarimu');
    expect(asNumber(m.fields.get('imyaka')!)).toBe(28);
  });

  test('ubwoko of instance is the class value (exact match)', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(n) { rusange _.n = n }
      }
      imiterere Child ikomoka Umuntu {}
      reka a = rema Umuntu(1)
      reka b = rema Child(2)
      reka t1 = ubwoko a == Umuntu
      reka t2 = ubwoko b == Child
      reka t3 = ubwoko b == Umuntu
      reka r = t1 && t2 && !t3
      r
    `);
    expect(asBool(result)).toBe(true);
  });

  test('instances compare by identity', () => {
    expect(asBool(evaluate(`
      imiterere C { tegura() {} }
      reka a = rema C()
      reka b = rema C()
      a == b
    `).result)).toBe(false);
    expect(asBool(evaluate(`
      imiterere C { tegura() {} }
      reka a = rema C()
      a == a
    `).result)).toBe(true);
  });

  test('class name is a type annotation (exact class)', () => {
    evaluate(`
      imiterere Umuntu {
        tegura(n) { rusange _.n = n }
      }
      reka k: Umuntu = rema Umuntu(1)
    `);
    expectKinError(
      `
      imiterere Umuntu {
        tegura(n) { rusange _.n = n }
      }
      imiterere Child ikomoka Umuntu {}
      reka k: Umuntu = rema Child(1)
    `,
      'K035',
    );
  });

  test('plain object is not an instance type', () => {
    expectKinError(
      `
      imiterere Umuntu {
        tegura(n) { rusange _.n = n }
      }
      reka bag: Umuntu = { n: 1 }
    `,
      'K035',
    );
  });

  test('rema then method chain', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) { rusange _.izina = izina }
        rusange porogaramu_ntoya get() { tanga _.izina }
      }
      rema Umuntu("Keza").get()
    `);
    expect(asString(result)).toBe('Keza');
  });

  test('ubwoko of two classes is the same type value', () => {
    expect(asBool(evaluate(`
      imiterere A {}
      imiterere B {}
      ubwoko A == ubwoko B
    `).result)).toBe(true);
  });

  test('leaked private bound method cannot be called outside', () => {
    expectKinError(
      `
      imiterere C {
        tegura() {}
        bwite porogaramu_ntoya secret() { tanga 42 }
        rusange porogaramu_ntoya leak() { tanga _.secret }
      }
      reka f = rema C().leak()
      f()
    `,
      'K041',
    );
  });

  test('freestanding callback cannot read private field under active method', () => {
    expectKinError(
      `
      imiterere C {
        tegura() { bwite _.s = 99 }
        rusange porogaramu_ntoya use(fn) { tanga fn(_) }
      }
      porogaramu_ntoya outsider(o) { tanga o.s }
      rema C().use(outsider)
    `,
      'K041',
    );
  });

  test('nested plain function inside method cannot use ambient private access', () => {
    expectKinError(
      `
      imiterere C {
        tegura() { bwite _.s = 99 }
        rusange porogaramu_ntoya m() {
          porogaramu_ntoya helper() { tanga _.s }
          tanga helper()
        }
      }
      rema C().m()
    `,
      'K041',
    );
  });

  test('duplicate method name is rejected', () => {
    expectKinError(
      `
      imiterere A {
        tegura() {}
        rusange porogaramu_ntoya jya() { tanga 1 }
        rusange porogaramu_ntoya jya() { tanga 2 }
      }
    `,
      'K043',
    );
  });

  test('child method cannot read parent private field', () => {
    expectKinError(
      `
      imiterere Parent {
        tegura() { bwite _.secret = 1 }
      }
      imiterere Child ikomoka Parent {
        rusange porogaramu_ntoya peek() { tanga _.secret }
      }
      rema Child().peek()
    `,
      'K041',
    );
  });
});
