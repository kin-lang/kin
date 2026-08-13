import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import os from 'os';
import * as log from '../src/lib/log';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import {
  asNumber,
  asString,
  evaluate,
  expectKinError,
} from './helpers';
import { ObjectVal } from '../src/runtime/values';

function runFile(absolutePath: string): void {
  const source = require('fs').readFileSync(absolutePath, 'utf-8');
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const env = createGlobalEnv(absolutePath);
  Interpreter.evaluate(ast, env);
}

describe('examples/importing', () => {
  beforeEach(() => {
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('runs index.kin (namespace imports)', () => {
    const file = path.join(process.cwd(), 'examples/importing/index.kin');
    expect(() => runFile(file)).not.toThrow();
  });

  test('runs with-oop.kin (imported class)', () => {
    const file = path.join(process.cwd(), 'examples/importing/with-oop.kin');
    expect(() => runFile(file)).not.toThrow();
  });
});

describe('koresha / emerera_gukoresha', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'kin-import-'));
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  function write(name: string, body: string): string {
    const p = path.join(tmp, name);
    writeFileSync(p, body, 'utf-8');
    return p;
  }

  test('imports exports as a namespace object', () => {
    write(
      'lib.kin',
      `
      porogaramu_ntoya add(a: umubare, b: umubare): umubare { tanga a + b }
      ntahinduka PI: umubare = 3
      emerera_gukoresha { add, PI }
    `,
    );
    const main2 = write(
      'main2.kin',
      `
      koresha "./lib.kin" nka lib
      reka x: umubare = lib.add(2, lib.PI)
    `,
    );
    const source = require('fs').readFileSync(main2, 'utf-8');
    const env = createGlobalEnv(main2);
    Interpreter.evaluate(new Parser().produceAST(source), env);
    expect(asNumber(env.lookupVar('x'))).toBe(5);
    const lib = env.lookupVar('lib') as ObjectVal;
    expect(lib.type).toBe('object');
    expect(asNumber(lib.properties.get('PI')!)).toBe(3);
  });

  test('optional semicolon after koresha', () => {
    write('u.kin', `reka v = 1\nemerera_gukoresha { v }`);
    const main = write(
      'm.kin',
      `koresha "./u.kin" nka u;\ntangaza_amakuru(u.v)`,
    );
    expect(() => runFile(main)).not.toThrow();
  });

  test('missing file is K044', () => {
    const main = write(
      'm.kin',
      `koresha "./nope.kin" nka x`,
    );
    try {
      runFile(main);
      throw new Error('expected throw');
    } catch (e: any) {
      expect(e.code).toBe('K044');
    }
  });

  test('circular import is K045', () => {
    write(
      'a.kin',
      `koresha "./b.kin" nka b\nemerera_gukoresha { }`,
    );
    write(
      'b.kin',
      `koresha "./a.kin" nka a\nemerera_gukoresha { }`,
    );
    // empty export list - still loads
    write(
      'a2.kin',
      `
      koresha "./b2.kin" nka b
      reka fromA = 1
      emerera_gukoresha { fromA }
    `,
    );
    write(
      'b2.kin',
      `
      koresha "./a2.kin" nka a
      reka fromB = 2
      emerera_gukoresha { fromB }
    `,
    );
    try {
      runFile(path.join(tmp, 'a2.kin'));
      throw new Error('expected circular import error');
    } catch (e: any) {
      expect(e.code).toBe('K045');
    }
  });

  test('export of undefined name is K046', () => {
    const f = write(
      'bad.kin',
      `emerera_gukoresha { missing }`,
    );
    try {
      runFile(f);
      throw new Error('expected throw');
    } catch (e: any) {
      expect(e.code).toBe('K046');
    }
  });

  test('second import of same path reuses cache', () => {
    write(
      'once.kin',
      `
      reka counter = 0
      counter = counter + 1
      emerera_gukoresha { counter }
    `,
    );
    const main = write(
      'main.kin',
      `
      koresha "./once.kin" nka a
      koresha "./once.kin" nka b
      reka same = a.counter == b.counter
    `,
    );
    const source = require('fs').readFileSync(main, 'utf-8');
    const env = createGlobalEnv(main);
    Interpreter.evaluate(new Parser().produceAST(source), env);
    // Both aliases see counter === 1 (module body runs once)
    expect(asNumber((env.lookupVar('a') as ObjectVal).properties.get('counter')!)).toBe(1);
    expect(asNumber((env.lookupVar('b') as ObjectVal).properties.get('counter')!)).toBe(1);
  });

  test('imported class works with rema and ubwoko', () => {
    write(
      'cls.kin',
      `
      imiterere Box {
        tegura(n: umubare) { rusange _.n = n }
        rusange porogaramu_ntoya get(): umubare { tanga _.n }
      }
      emerera_gukoresha { Box }
    `,
    );
    const main = write(
      'main.kin',
      `
      koresha "./cls.kin" nka m
      reka b: Box = rema m.Box(7)
      reka ok = ubwoko b == m.Box
      reka n = b.get()
    `,
    );
    const source = require('fs').readFileSync(main, 'utf-8');
    const env = createGlobalEnv(main);
    Interpreter.evaluate(new Parser().produceAST(source), env);
    expect(asNumber(env.lookupVar('n'))).toBe(7);
  });

  test('parser accepts koresha ... nka and emerera_gukoresha', () => {
    const ast = new Parser().produceAST(`
      koresha "./x.kin" nka x
      emerera_gukoresha { a, b }
    `);
    expect(ast.body[0].kind).toBe('ImportDeclaration');
    expect(ast.body[1].kind).toBe('ExportDeclaration');
  });
});
