import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as log from '../src/lib/log';
import {
  asBool,
  asNumber,
  asString,
  evaluate,
  expectKinError,
} from './helpers';

describe('operators and value model', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('string + string concatenates', () => {
    const { result } = evaluate('tangaza_amakuru("Muraho " + "isi")');
    expect(result.type).toBe('null');
    expect(log.LogMessage).toHaveBeenCalledWith('Muraho isi');
  });

  test('string + number coerces the number', () => {
    expect(asString(evaluate('"imyaka " + 25').result)).toBe('imyaka 25');
    expect(asString(evaluate('3 + "x"').result)).toBe('3x');
  });

  test('truthiness: non-zero numbers are true in niba', () => {
    evaluate(`
      niba (1) { tangaza_amakuru("a") }
      niba_byanze { tangaza_amakuru("b") }
    `);
    expect(log.LogMessage).toHaveBeenCalledWith('a');
    expect(log.LogMessage).not.toHaveBeenCalledWith('b');
  });

  test('truthiness: 0, sibyo, ubusa are false', () => {
    for (const cond of ['0', 'sibyo', 'ubusa']) {
      vi.mocked(log.LogMessage).mockClear();
      evaluate(`
        niba (${cond}) { tangaza_amakuru("yes") }
        niba_byanze { tangaza_amakuru("no") }
      `);
      expect(log.LogMessage).toHaveBeenCalledWith('no');
    }
  });

  test('exponent is right-associative and above multiply', () => {
    expect(asNumber(evaluate('2 ^ 3 ^ 2').result)).toBe(512);
    expect(asNumber(evaluate('2 * 3 ^ 2').result)).toBe(18);
  });

  test('unary minus on variables', () => {
    expect(asNumber(evaluate('reka x = 10 reka y = -x y').result)).toBe(-10);
  });

  test('x -5 parses as subtraction', () => {
    expect(
      asNumber(evaluate('reka x = 10 tangaza_amakuru(x -5) x -5').result),
    ).toBe(5);
  });

  test('array and object literals support postfix indexing/members', () => {
    expect(asNumber(evaluate('[1, 2, 3][0]').result)).toBe(1);
    expect(asString(evaluate('{izina: "K"}.izina').result)).toBe('K');
  });

  test('string comparisons are locale-independent', () => {
    expect(asBool(evaluate('"a" < "b"').result)).toBe(true);
    expect(asBool(evaluate('"b" > "a"').result)).toBe(true);
  });

  test('bad operator types raise instead of returning ubusa', () => {
    const err = expectKinError('nibyo * "x"', 'K012');
    expect(err.code).toBe('K012');
  });

  test('method form arr.ingano() and string methods', () => {
    expect(asNumber(evaluate('reka a = [1,2,3] a.ingano()').result)).toBe(3);
    expect(asString(evaluate('reka s = "Kin" s.inyuguti_nkuru()').result)).toBe(
      'KIN',
    );
    // Namespace form still works
    expect(asNumber(evaluate('KIN_URUTONDE.ingano([1,2])').result)).toBe(2);
    expect(
      asString(evaluate('KIN_AMAGAMBO.inyuguti_nkuru("Kin")').result),
    ).toBe('KIN');
  });
});
