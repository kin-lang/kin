import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { NumberVal } from '../src/runtime/values';
import { KinTypeError } from '../src/lib/errors';

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

  describe('Error handling (Kin errors, not host TypeErrors)', () => {
    test('should throw a Kin error when a null is used as an index', () => {
      expect(() =>
        evaluate(`
          reka arr = [1, 2]
          arr[ubusa]
        `),
      ).toThrow(KinTypeError);
      expect(() =>
        evaluate(`
          reka arr = [1, 2]
          arr[ubusa]
        `),
      ).toThrow('Cannot use null as an index/key');
    });

    test('should throw a Kin error when an object is used as an index', () => {
      expect(() =>
        evaluate(`
          reka arr = [1, 2]
          reka o = { a: 1 }
          arr[o]
        `),
      ).toThrow('Cannot use object as an index/key');
    });

    test('should throw a Kin error when a boolean is used as an index', () => {
      expect(() =>
        evaluate(`
          reka arr = [1, 2]
          arr[nibyo]
        `),
      ).toThrow('Cannot use boolean as an index/key');
    });

    test('should throw a Kin error when a function is used as an index', () => {
      expect(() =>
        evaluate(`
          porogaramu_ntoya f() {
            tanga 1
          }
          reka arr = [1, 2]
          arr[f]
        `),
      ).toThrow('Cannot use fn as an index/key');
    });

    test('should throw a Kin error when walking through a missing nested index', () => {
      expect(() =>
        evaluate(`
          reka arr = [[1, 2]]
          arr[1][0]
        `),
      ).toThrow("Cannot access property '0' of ubusa");
    });

    test('should throw a Kin error when accessing a property of a number', () => {
      expect(() =>
        evaluate(`
          reka x = 5
          x.foo
        `),
      ).toThrow("Cannot access property 'foo' of number");
    });

    test('should throw a Kin error when walking through a primitive element', () => {
      expect(() =>
        evaluate(`
          reka arr = [5]
          arr[0][0]
        `),
      ).toThrow("Cannot access property '0' of number");
    });

    test('should return ubusa (null) for a missing key instead of throwing', () => {
      const result = evaluate(`
        reka obj = { a: 1 }
        obj.missing
      `);

      expect(result.type).toBe('null');
    });

    test('should not throw when arithmetic uses an out-of-bounds index', () => {
      const result = evaluate(`
        reka arr = [1, 2]
        reka v = arr[5] + 1
        v
      `);

      expect(result.type).toBe('null');
    });

    test('should run the examples/arrays.kin file without throwing', () => {
      const source = readFileSync(
        new URL('../examples/arrays.kin', import.meta.url),
        'utf-8',
      );

      expect(() => evaluate(source)).not.toThrow();
    });
  });
});
