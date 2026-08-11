import { describe, expect, test } from 'vitest';
import { asBool, evaluate } from './helpers';

describe('nested parenthesized expressions (issue #58)', () => {
  test('evaluates the reported ((var > var2) && !(var3 != var4) || (var5 == var6))', () => {
    const { result } = evaluate(`
      reka var = 10
      reka var2 = 5
      reka var3 = 1
      reka var4 = 1
      reka var5 = 2
      reka var6 = 2
      reka result = ((var > var2) && !(var3 != var4) || (var5 == var6))
      result
    `);

    expect(asBool(result)).toBe(true);
  });

  test('evaluates the reported expression when the first clause is false', () => {
    const { result } = evaluate(`
      reka var = 1
      reka var2 = 5
      reka var3 = 1
      reka var4 = 1
      reka var5 = 2
      reka var6 = 2
      reka result = ((var > var2) && !(var3 != var4) || (var5 == var6))
      result
    `);

    // (false && true) || true
    expect(asBool(result)).toBe(true);
  });

  test('evaluates the reported expression as false when every clause is false', () => {
    const { result } = evaluate(`
      reka var = 1
      reka var2 = 5
      reka var3 = 1
      reka var4 = 2
      reka var5 = 2
      reka var6 = 3
      reka result = ((var > var2) && !(var3 != var4) || (var5 == var6))
      result
    `);

    // (false && false) || false
    expect(asBool(result)).toBe(false);
  });

  test('evaluates negation of a parenthesized comparison', () => {
    const { result: notEqual } = evaluate(`
      reka a = 1
      reka b = 2
      !(a == b)
    `);
    expect(asBool(notEqual)).toBe(true);

    const { result: equal } = evaluate(`
      reka a = 1
      reka b = 1
      !(a == b)
    `);
    expect(asBool(equal)).toBe(false);
  });

  test('evaluates chained logical operators inside parentheses', () => {
    const { result } = evaluate(`
      reka a = sibyo
      reka b = nibyo
      reka c = nibyo
      reka result = (a && b || c)
      result
    `);

    // (false && true) || true
    expect(asBool(result)).toBe(true);
  });

  test('evaluates deeply nested grouped comparisons', () => {
    const { result } = evaluate(`
      reka a = 3
      reka b = 1
      reka c = 0
      reka d = 4
      reka result = (((a > b) && (c < d)))
      result
    `);

    expect(asBool(result)).toBe(true);
  });

  test('still evaluates !identifier on a boolean variable', () => {
    const { result } = evaluate(`
      reka flag = nibyo
      !flag
    `);

    expect(asBool(result)).toBe(false);
  });
});
