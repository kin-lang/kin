import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import {
  asBool,
  asNumber,
  asString,
  evaluate,
  expectKinError,
} from './helpers';
import {
  ClassVal,
  InstanceVal,
  TypeVal,
} from '../src/runtime/values';

describe('OOP (imiterere / rema / methods)', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('declares a class and constructs an instance with public fields', () => {
    const { env } = evaluate(`
      imiterere Umuntu {
        tegura(izina, imyaka) {
          rusange _.izina = izina
          rusange _.imyaka = imyaka
        }
      }
      reka p = rema Umuntu("Keza", 20)
    `);
    const klass = env.lookupVar('Umuntu') as ClassVal;
    expect(klass.type).toBe('class');
    expect(klass.name).toBe('Umuntu');

    const p = env.lookupVar('p') as InstanceVal;
    expect(p.type).toBe('instance');
    expect(p.classOf).toBe(klass);
    expect(asString(p.fields.get('izina')!.value)).toBe('Keza');
    expect(asNumber(p.fields.get('imyaka')!.value)).toBe(20);
  });

  test('public methods can read fields and return values', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      reka p = rema Umuntu("Aline")
      p.izina_ryose()
    `);
    expect(asString(result)).toBe('Aline');
  });

  test('bound methods keep the receiver', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      reka p = rema Umuntu("Keza")
      reka f = p.izina_ryose
      f()
    `);
    expect(asString(result)).toBe('Keza');
  });

  test('public fields are readable and writable from top level', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(imyaka) {
          rusange _.imyaka = imyaka
        }
      }
      reka p = rema Umuntu(18)
      p.imyaka = 19
      p.imyaka
    `);
    expect(asNumber(result)).toBe(19);
  });

  test('private fields are hidden outside the class', () => {
    expectKinError(
      `
      imiterere Umuntu {
        tegura(imyaka) {
          bwite _.imyaka = imyaka
        }
      }
      reka p = rema Umuntu(20)
      p.imyaka
      `,
      'K036',
    );
  });

  test('private fields are usable from public methods of the same class', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(imyaka) {
          bwite _.imyaka = imyaka
        }
        rusange porogaramu_ntoya imyaka_yose() {
          tanga _.imyaka
        }
      }
      reka p = rema Umuntu(21)
      p.imyaka_yose()
    `);
    expect(asNumber(result)).toBe(21);
  });

  test('methods may update existing fields without a visibility modifier', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(imyaka) {
          rusange _.imyaka = imyaka
        }
        rusange porogaramu_ntoya shyira(imyaka_nshya) {
          _.imyaka = imyaka_nshya
        }
      }
      reka p = rema Umuntu(10)
      p.shyira(12)
      p.imyaka
    `);
    expect(asNumber(result)).toBe(12);
  });

  test('inheritance: child without tegura inherits parent constructor', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      imiterere Umwarimu ikomoka Umuntu {
        rusange porogaramu_ntoya kwibwira() {
          tanga "mwalimu"
        }
      }
      reka m = rema Umwarimu("Keza")
      m.izina_ryose()
    `);
    expect(asString(result)).toBe('Keza');
  });

  test('inheritance: child method overrides parent method', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura() {}
        rusange porogaramu_ntoya jya() {
          tanga "parent"
        }
      }
      imiterere Umwana ikomoka Umuntu {
        rusange porogaramu_ntoya jya() {
          tanga "child"
        }
      }
      reka c = rema Umwana()
      c.jya()
    `);
    expect(asString(result)).toBe('child');
  });

  test('child tegura replaces parent constructor entirely', () => {
    const { env } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
      }
      imiterere Umunyeshuri ikomoka Umuntu {
        tegura(ishuri) {
          rusange _.ishuri = ishuri
        }
      }
      reka u = rema Umunyeshuri("GS Remera")
    `);
    const u = env.lookupVar('u') as InstanceVal;
    expect(u.fields.has('ishuri')).toBe(true);
    expect(u.fields.has('izina')).toBe(false);
  });

  test('class with no tegura is instantiable with zero args', () => {
    const { env } = evaluate(`
      imiterere Ikintu {
        rusange porogaramu_ntoya jya() {
          tanga 1
        }
      }
      reka x = rema Ikintu()
    `);
    expect((env.lookupVar('x') as InstanceVal).type).toBe('instance');
  });

  test('rema Class(args).method() chains member access after construction', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      rema Umuntu("Eric").izina_ryose()
    `);
    expect(asString(result)).toBe('Eric');
  });

  test('classes are first-class values', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
        }
        rusange porogaramu_ntoya izina_ryose() {
          tanga _.izina
        }
      }
      porogaramu_ntoya rema_umuntu(C, izina) {
        tanga rema C(izina)
      }
      reka p = rema_umuntu(Umuntu, "Beza")
      p.izina_ryose()
    `);
    expect(asString(result)).toBe('Beza');
  });

  test('ubwoko of instance is the class value (exact match)', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura() {}
      }
      imiterere Umwarimu ikomoka Umuntu {
      }
      reka m = rema Umwarimu()
      ubwoko m == Umwarimu
    `);
    expect(asBool(result)).toBe(true);

    const { result: isParent } = evaluate(`
      imiterere Umuntu {
        tegura() {}
      }
      imiterere Umwarimu ikomoka Umuntu {
      }
      reka m = rema Umwarimu()
      ubwoko m == Umuntu
    `);
    expect(asBool(isParent)).toBe(false);
  });

  test('ubwoko returns shared type values for primitives and functions', () => {
    const { result: numbers } = evaluate('ubwoko 5 == ubwoko 10');
    expect(asBool(numbers)).toBe(true);

    const { result: mixed } = evaluate('ubwoko 5 == ubwoko "5"');
    expect(asBool(mixed)).toBe(false);

    const { result: fns } = evaluate(`
      porogaramu_ntoya f() { tanga 1 }
      ubwoko f == ubwoko tangaza_amakuru
    `);
    expect(asBool(fns)).toBe(true);

    const { result: t } = evaluate('ubwoko 5');
    expect(t.type).toBe('type');
    expect((t as TypeVal).name).toBe('number');
  });

  test('instances compare by identity', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura() {}
      }
      reka a = rema Umuntu()
      reka b = rema Umuntu()
      a == b
    `);
    expect(asBool(result)).toBe(false);

    const { result: same } = evaluate(`
      imiterere Umuntu {
        tegura() {}
      }
      reka a = rema Umuntu()
      a == a
    `);
    expect(asBool(same)).toBe(true);
  });

  test('cannot create fields outside tegura', () => {
    expectKinError(
      `
      imiterere Umuntu {
        tegura() {}
        rusange porogaramu_ntoya jya() {
          _.x = 1
        }
      }
      reka p = rema Umuntu()
      p.jya()
      `,
      'K037',
    );
  });

  test('rema on non-class is a type error', () => {
    expectKinError('rema 5()', 'K039');
  });

  test('wrong tegura arity is a type error', () => {
    expectKinError(
      `
      imiterere Umuntu {
        tegura(a, b) {
          rusange _.a = a
        }
      }
      rema Umuntu(1)
      `,
      'K011',
    );
  });

  test('private method call from outside is rejected', () => {
    expectKinError(
      `
      imiterere A {
        tegura() {}
        bwite porogaramu_ntoya secret() { tanga 1 }
      }
      reka a = rema A()
      a.secret()
      `,
      'K036',
    );
  });

  test('private field assign from outside is rejected', () => {
    expectKinError(
      `
      imiterere A {
        tegura() { bwite _.x = 1 }
      }
      reka a = rema A()
      a.x = 2
      `,
      'K036',
    );
  });

  test('child method cannot read parent private field', () => {
    expectKinError(
      `
      imiterere P {
        tegura() { bwite _.s = 9 }
      }
      imiterere C ikomoka P {
        rusange porogaramu_ntoya bad() { tanga _.s }
      }
      reka c = rema C()
      c.bad()
      `,
      'K036',
    );
  });

  test('parent public wrapper on child instance can read parent private', () => {
    const { result } = evaluate(`
      imiterere P {
        tegura() { bwite _.s = 9 }
        rusange porogaramu_ntoya g() { tanga _.s }
      }
      imiterere C ikomoka P {}
      reka c = rema C()
      c.g()
    `);
    expect(asNumber(result)).toBe(9);
  });

  test('double tegura is a syntax error', () => {
    expectKinError(
      `
      imiterere A {
        tegura() {}
        tegura() {}
      }
      `,
      'K033',
    );
  });

  test('nested instance field access _.abana[0].izina', () => {
    const { result } = evaluate(`
      imiterere Umuntu {
        tegura(izina) {
          rusange _.izina = izina
          rusange _.abana = []
        }
        rusange porogaramu_ntoya set(u) { _.abana = [u] }
        rusange porogaramu_ntoya first() { tanga _.abana[0].izina }
      }
      reka p = rema Umuntu("p")
      reka c = rema Umuntu("c")
      p.set(c)
      p.first()
    `);
    expect(asString(result)).toBe('c');
  });

  test('calling an instance is a type error (not a host crash)', () => {
    expectKinError(
      `
      imiterere A { tegura() {} }
      reka a = rema A()
      a()
      `,
      'K010',
    );
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
      'K036',
    );
  });

  test('nested function cannot invent fields after tegura returns', () => {
    expectKinError(
      `
      imiterere Box {
        tegura() {
          porogaramu_ntoya add_field() {
            rusange _.extra = 1
          }
          rusange _.add = add_field
        }
      }
      reka b = rema Box()
      b.add()
      `,
      'K032',
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
      'K040',
    );
  });

  test('ubwoko of a class is the class type value', () => {
    const { result } = evaluate(`
      imiterere A { tegura() {} }
      imiterere B { tegura() {} }
      ubwoko A == ubwoko B
    `);
    expect(asBool(result)).toBe(true);
  });

  test('top-level rusange method is a syntax error', () => {
    expectKinError(
      `rusange porogaramu_ntoya f() { tanga 1 }`,
      'K041',
    );
  });
});
