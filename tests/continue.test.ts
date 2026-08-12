import { describe, test, expect } from 'vitest';
import { evaluate, asNumber } from './helpers';

describe('komeza (continue)', () => {
  test('should skip the rest of the current iteration in subiramo_niba', () => {
    const { env } = evaluate(`
      reka n = 0
      reka sum = 0
      subiramo_niba (n < 5) {
        n = n + 1
        niba (n == 3) {
          komeza
        }
        sum = sum + n
      }
    `);

    expect(asNumber(env.lookupVar('n'))).toBe(5);
    // 1 + 2 + 4 + 5  (3 skipped)
    expect(asNumber(env.lookupVar('sum'))).toBe(12);
  });

  test('should skip even numbers when komeza is used after the increment', () => {
    const { env } = evaluate(`
      reka n = 0
      reka odds = 0
      reka count = 0
      subiramo_niba (n < 6) {
        n = n + 1
        niba (n % 2 == 0) {
          komeza
        }
        odds = odds + n
        count = count + 1
      }
    `);

    expect(asNumber(env.lookupVar('n'))).toBe(6);
    expect(asNumber(env.lookupVar('odds'))).toBe(9); // 1 + 3 + 5
    expect(asNumber(env.lookupVar('count'))).toBe(3);
  });

  test('should accept an optional semicolon after komeza', () => {
    const { env } = evaluate(`
      reka n = 0
      reka hits = 0
      subiramo_niba (n < 3) {
        n = n + 1
        niba (n == 2) {
          komeza;
        }
        hits = hits + 1
      }
    `);

    expect(asNumber(env.lookupVar('hits'))).toBe(2);
  });

  test('should only continue the innermost loop', () => {
    const { env } = evaluate(`
      reka outer = 0
      reka innerHits = 0
      reka skipped = 0
      subiramo_niba (outer < 3) {
        outer = outer + 1
        reka inner = 0
        subiramo_niba (inner < 3) {
          inner = inner + 1
          niba (inner == 2) {
            skipped = skipped + 1
            komeza
          }
          innerHits = innerHits + 1
        }
      }
    `);

    expect(asNumber(env.lookupVar('outer'))).toBe(3);
    expect(asNumber(env.lookupVar('skipped'))).toBe(3);
    expect(asNumber(env.lookupVar('innerHits'))).toBe(6);
  });

  test('should throw a clear error when komeza is evaluated outside a loop', () => {
    // Top-level komeza is caught by eval_program and reported with K013.
    expect(() => evaluate('komeza')).toThrowError(
      'komeza can only be used inside a loop',
    );
  });
});
