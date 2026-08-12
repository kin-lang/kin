import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as log from '../src/lib/log';
import { asNumber, asString, evaluate } from './helpers';

describe('control flow signals', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('A: tanga exits the loop and the function', () => {
    // Acceptance: prints "found at 1" then "index: 1"
    evaluate(`
      porogaramu_ntoya shakisha(arr, key) {
        reka i = 0
        subiramo_niba (i < KIN_URUTONDE.ingano(arr)) {
          niba (arr[i] == key) {
            tangaza_amakuru("found at ", i)
            tanga i
          }
          i = i + 1
        }
        tanga 0 - 1
      }
      tangaza_amakuru("index: ", shakisha([10, 20, 30, 20], 20))
    `);

    expect(log.LogMessage).toHaveBeenCalledWith('found at 1');
    expect(log.LogMessage).toHaveBeenCalledWith('index: 1');
    // Must not print later matches.
    expect(log.LogMessage).not.toHaveBeenCalledWith('found at 3');
  });

  test('B: statements after tanga inside a block do not run', () => {
    evaluate(`
      porogaramu_ntoya f(n) {
        niba (n > 0) {
          tanga "positive"
          tangaza_amakuru("THIS SHOULD NOT PRINT")
        }
        tanga "non-positive"
      }
      tangaza_amakuru(f(5))
    `);

    expect(log.LogMessage).toHaveBeenCalledWith('positive');
    expect(log.LogMessage).not.toHaveBeenCalledWith('THIS SHOULD NOT PRINT');
  });

  test('C: hagarara inside a function does not break the caller loop', () => {
    evaluate(`
      porogaramu_ntoya gukora() { tanga; }
      reka i = 0
      subiramo_niba(i < 3) {
        tangaza_amakuru("iteration ", i)
        gukora()
        i = i + 1
      }
      tangaza_amakuru("done")
    `);

    expect(log.LogMessage).toHaveBeenCalledWith('iteration 0');
    expect(log.LogMessage).toHaveBeenCalledWith('iteration 1');
    expect(log.LogMessage).toHaveBeenCalledWith('iteration 2');
    expect(log.LogMessage).toHaveBeenCalledWith('done');
  });

  test('hagarara escaping a function raises a Kin error', () => {
    expect(() =>
      evaluate(`
        porogaramu_ntoya gukora() { hagarara }
        reka i = 0
        subiramo_niba(i < 3) {
          gukora()
          i = i + 1
        }
      `),
    ).toThrow(/hagarara cannot be used across a function boundary/);
  });

  test('return from nested conditional', () => {
    const { result } = evaluate(`
      porogaramu_ntoya sign(n) {
        niba (n > 0) {
          tanga "pos"
        }
        niba_byanze {
          niba (n < 0) {
            tanga "neg"
          }
          tanga "zero"
        }
      }
      sign(-3)
    `);
    expect(asString(result)).toBe('neg');
  });

  test('break and continue do not escape a function', () => {
    expect(() =>
      evaluate(`
        porogaramu_ntoya f() { komeza }
        f()
      `),
    ).toThrow(/komeza/);

    expect(() =>
      evaluate(`
        porogaramu_ntoya f() { hagarara }
        f()
      `),
    ).toThrow(/hagarara/);
  });

  test('inner break does not exit the outer loop', () => {
    const { env } = evaluate(`
      reka outer = 0
      reka hits = 0
      subiramo_niba (outer < 3) {
        outer = outer + 1
        reka inner = 0
        subiramo_niba (inner < 5) {
          inner = inner + 1
          niba (inner == 2) {
            hagarara
          }
          hits = hits + 1
        }
      }
    `);
    expect(asNumber(env.lookupVar('outer'))).toBe(3);
    // Each outer iteration: inner hits 1 once before break at 2.
    expect(asNumber(env.lookupVar('hits'))).toBe(3);
  });

  test('recursion still works: fib(15) equals 610', () => {
    const { result } = evaluate(`
      porogaramu_ntoya fib(n) {
        niba (n < 2) { tanga n }
        tanga fib(n - 1) + fib(n - 2)
      }
      fib(15)
    `);
    expect(asNumber(result)).toBe(610);
  });
});
