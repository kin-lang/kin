import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { NumberVal } from '../src/runtime/values';

describe('Member Expression (computed + dot access) Tests', () => {
  function evaluate(sourceCode: string) {
    const parser = new Parser();
    const ast = parser.produceAST(sourceCode);
    const env = createGlobalEnv('test.kin');
    return Interpreter.evaluate(ast, env);
  }

  describe('Single-level access', () => {
    test('should read a value from an array', () => {
      const result = evaluate(`
        reka arr = [10, 20, 30]
        arr[1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(20);
    });

    test('should write a value to an array', () => {
      const result = evaluate(`
        reka arr = [10, 20, 30]
        arr[1] = 99
        arr[1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(99);
    });
  });

  describe('Nested array access', () => {
    test('should read a value from a nested array', () => {
      const result = evaluate(`
        reka list4 = [[1, 2], [3, 4]]
        list4[1][0]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(3);
    });

    test('should write a value through a nested path', () => {
      const result = evaluate(`
        reka list4 = [[1, 2], [3, 4]]
        list4[1][0] = 9
        list4[1][0]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(9);
    });

    test('should not touch other elements when writing through a nested path', () => {
      const result = evaluate(`
        reka list4 = [[1, 2], [3, 4]]
        list4[1][0] = 9
        list4[0][0]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(1);
    });

    test('should read from a 3-dimensional array', () => {
      const result = evaluate(`
        reka deep = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
        deep[1][0][1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(6);
    });

    test('should write through a 3-dimensional array', () => {
      const result = evaluate(`
        reka deep = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
        deep[1][0][1] = 99
        deep[1][0][1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(99);
    });
  });

  describe('Deep object (dot) access', () => {
    test('should read a deeply nested property', () => {
      const result = evaluate(`
        reka obj = { a: { b: { c: 42 } } }
        obj.a.b.c
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(42);
    });

    test('should write a deeply nested property', () => {
      const result = evaluate(`
        reka obj = { a: { b: { c: 42 } } }
        obj.a.b.c = 7
        obj.a.b.c
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(7);
    });

    test('should access properties via computed string keys', () => {
      const result = evaluate(`
        reka obj = { x: { y: 5 } }
        obj["x"]["y"]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(5);
    });
  });

  describe('Mixed and scoped access', () => {
    test('should mix dot and computed access', () => {
      const result = evaluate(`
        reka obj = { list: [10, 20] }
        obj.list[1] = 50
        obj.list[1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(50);
    });

    test('should evaluate the index in the current scope', () => {
      const result = evaluate(`
        reka arr = [10, 20, 30]
        reka i = 0
        reka total = 0
        subiramo_niba (i < 3) {
          reka idx = i
          total = total + arr[idx]
          i = i + 1
        }
        total
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(60);
    });

    test('should evaluate computed indexes that are expressions', () => {
      const result = evaluate(`
        reka arr = [1, 2, 3, 4]
        reka i = 0
        arr[i + 1]
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(2);
    });

    test('should access functions stored in arrays', () => {
      const result = evaluate(`
        porogaramu_ntoya add(a, b) {
          tanga a + b
        }
        reka fns = [add]
        fns[0](2, 3)
      `);

      expect(result.type).toBe('number');
      expect((result as NumberVal).value).toBe(5);
    });
  });
});
