import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { Validator } from '../src/lib/validator';
import { StringVal, NumberVal } from '../src/runtime/values';

function run(sourceCode: string) {
  const parser = new Parser();
  const ast = parser.produceAST(sourceCode);
  const env = createGlobalEnv('test.kin');
  return Interpreter.evaluate(ast, env);
}

describe('Validator (Igenzura) Tests', () => {
  describe('Unit Tests', () => {
    test('requireMinArgs should throw when args are below the minimum', () => {
      expect(() => Validator.requireMinArgs('f', 0, 1)).toThrow(
        'f expects at least 1 argument',
      );
      expect(() => Validator.requireMinArgs('f', 1, 2)).toThrow(
        'f expects at least 2 arguments',
      );
    });

    test('requireMinArgs should not throw when args meet or exceed the minimum', () => {
      expect(() => Validator.requireMinArgs('f', 1, 1)).not.toThrow();
      expect(() => Validator.requireMinArgs('f', 3, 2)).not.toThrow();
    });

    test('requireExactArgs should throw when args count does not match', () => {
      expect(() => Validator.requireExactArgs('f', 0, 1)).toThrow(
        'f expects 1 argument',
      );
      expect(() => Validator.requireExactArgs('f', 1, 2)).toThrow(
        'f expects 2 arguments',
      );
      expect(() => Validator.requireExactArgs('f', 3, 2)).toThrow(
        'f expects 2 arguments',
      );
    });

    test('requireExactArgs should not throw when args count matches', () => {
      expect(() => Validator.requireExactArgs('f', 2, 2)).not.toThrow();
    });
  });

  describe('Minimum Arity Integration Tests', () => {
    test('tangaza_amakuru with no args should throw', () => {
      expect(() => run('tangaza_amakuru()')).toThrow(
        'tangaza_amakuru expects at least 1 argument',
      );
    });

    test('tangaza_amakuru with one arg should not throw', () => {
      expect(() => run('tangaza_amakuru("kin")')).not.toThrow();
    });

    test('KIN_URUTONDE.ingano with no args should throw', () => {
      expect(() => run('KIN_URUTONDE.ingano()')).toThrow(
        'KIN_URUTONDE.ingano expects at least 1 argument',
      );
    });

    test('KIN_URUTONDE.ongera_kumusozo with one arg should throw', () => {
      expect(() => run('KIN_URUTONDE.ongera_kumusozo([1])')).toThrow(
        'KIN_URUTONDE.ongera_kumusozo expects at least 2 arguments',
      );
    });

    test('KIN_IMIBARE.umubare_utazwi with one arg should throw', () => {
      expect(() => run('KIN_IMIBARE.umubare_utazwi(1)')).toThrow(
        'KIN_IMIBARE.umubare_utazwi expects at least 2 arguments',
      );
    });

    test('KIN_IMIBARE.umuzikare with no args should throw', () => {
      expect(() => run('KIN_IMIBARE.umuzikare()')).toThrow(
        'KIN_IMIBARE.umuzikare expects at least 1 argument',
      );
    });

    test('KIN_INYANDIKO.soma with no args should throw', () => {
      expect(() => run('KIN_INYANDIKO.soma()')).toThrow(
        'KIN_INYANDIKO.soma expects at least 1 argument',
      );
    });

    test('KIN_INYANDIKO.andika with no args should throw', () => {
      expect(() => run('KIN_INYANDIKO.andika()')).toThrow(
        'KIN_INYANDIKO.andika expects at least 2 arguments',
      );
    });
  });

  describe('Exact Arity Integration Tests', () => {
    test('KIN_AMAGAMBO.ingano with no args should throw', () => {
      expect(() => run('KIN_AMAGAMBO.ingano()')).toThrow(
        'KIN_AMAGAMBO.ingano expects 1 argument',
      );
    });

    test('KIN_AMAGAMBO.ingano with two args should throw', () => {
      expect(() => run('KIN_AMAGAMBO.ingano("kin", "lang")')).toThrow(
        'KIN_AMAGAMBO.ingano expects 1 argument',
      );
    });

    test('KIN_AMAGAMBO.inyuguti with one arg should throw', () => {
      expect(() => run('KIN_AMAGAMBO.inyuguti("kin")')).toThrow(
        'KIN_AMAGAMBO.inyuguti expects 2 arguments',
      );
    });

    test('KIN_AMAGAMBO.inyuguti with three args should throw', () => {
      expect(() => run('KIN_AMAGAMBO.inyuguti("kin", 1, 2)')).toThrow(
        'KIN_AMAGAMBO.inyuguti expects 2 arguments',
      );
    });

    test('KIN_AMAGAMBO.tandukanya with one arg should throw', () => {
      expect(() => run('KIN_AMAGAMBO.tandukanya("kin")')).toThrow(
        'KIN_AMAGAMBO.tandukanya expects 2 arguments',
      );
    });
  });

  describe('Successful Native Function Calls', () => {
    test('KIN_AMAGAMBO.ingano with one arg returns string length', () => {
      const result = run('KIN_AMAGAMBO.ingano("kin")');
      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(3);
    });

    test('KIN_AMAGAMBO.inyuguti with two args returns the char', () => {
      const result = run('KIN_AMAGAMBO.inyuguti("kin", 0)');
      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('k');
    });

    test('KIN_AMAGAMBO.inyuguti_nkuru returns uppercase', () => {
      const result = run('KIN_AMAGAMBO.inyuguti_nkuru("kin")');
      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('KIN');
    });

    test('KIN_AMAGAMBO.inyuguti_ntoya returns lowercase', () => {
      const result = run('KIN_AMAGAMBO.inyuguti_ntoya("KIN")');
      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('kin');
    });

    test('KIN_AMAGAMBO.huza joins one or more strings', () => {
      const result = run('KIN_AMAGAMBO.huza("k", "i", "n")');
      expect(result.type).toBe('string');
      expect((result as StringVal).value).toBe('kin');
    });

    test('KIN_URUTONDE.ingano returns array size', () => {
      const result = run('KIN_URUTONDE.ingano([1, 2, 3])');
      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(3);
    });

    test('KIN_URUTONDE.ongera_kumusozo returns new array size', () => {
      const result = run('KIN_URUTONDE.ongera_kumusozo([1], 2)');
      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(2);
    });

    test('KIN_IMIBARE.umuzikare returns sqrt', () => {
      const result = run('KIN_IMIBARE.umuzikare(16)');
      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(4);
    });
  });
});
