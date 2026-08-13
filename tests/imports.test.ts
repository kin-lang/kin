import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { withCurrentFile } from '../src/runtime/path-resolve';
import { KinError } from '../src/lib/errors';
import Environment from '../src/runtime/environment';
import { asNumber, asString, evaluate } from './helpers';

function runFile(entryPath: string): Environment {
  const source = readFileSync(entryPath, 'utf-8');
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const env = createGlobalEnv(entryPath);
  withCurrentFile(path.resolve(entryPath), () => {
    Interpreter.evaluate(ast, env);
  });
  return env;
}

describe('injiza (multi-file import)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'kin-import-'));
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test('loads declarations and functions into the caller environment', () => {
    writeFileSync(
      path.join(tmpDir, 'utils.kin'),
      `
porogaramu_ntoya ongera(a, b) {
  tanga a + b
}
reka PI = 3
`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("utils.kin")
reka sum = ongera(2, 3)
reka out = sum + PI
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('sum'))).toBe(5);
    expect(asNumber(env.lookupVar('out'))).toBe(8);
    expect(asNumber(env.lookupVar('PI'))).toBe(3);
  });

  test('resolves paths relative to the importing file', () => {
    const libDir = path.join(tmpDir, 'lib');
    mkdirSync(libDir);
    writeFileSync(
      path.join(libDir, 'helper.kin'),
      `reka from_helper = 42`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("lib/helper.kin")
reka x = from_helper
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('x'))).toBe(42);
  });

  test('nested imports resolve relative to the nested file', () => {
    const libDir = path.join(tmpDir, 'lib');
    mkdirSync(libDir);
    writeFileSync(
      path.join(libDir, 'deep.kin'),
      `reka deep_val = 7`,
    );
    writeFileSync(
      path.join(libDir, 'mid.kin'),
      `
injiza("deep.kin")
reka mid_val = deep_val + 1
`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("lib/mid.kin")
reka total = mid_val + deep_val
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('deep_val'))).toBe(7);
    expect(asNumber(env.lookupVar('mid_val'))).toBe(8);
    expect(asNumber(env.lookupVar('total'))).toBe(15);
  });

  test('load-once: second injiza of the same file is a no-op', () => {
    writeFileSync(
      path.join(tmpDir, 'once.kin'),
      `reka counter = 1`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("once.kin")
injiza("once.kin")
reka c = counter
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('c'))).toBe(1);
  });

  test('throws K032 when the file does not exist', () => {
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `injiza("missing.kin")`,
    );

    try {
      runFile(path.join(tmpDir, 'main.kin'));
      throw new Error('expected K032');
    } catch (e) {
      expect(e).toBeInstanceOf(KinError);
      expect((e as KinError).code).toBe('K032');
      expect((e as KinError).message).toMatch(/missing\.kin/);
    }
  });

  test('throws K033 on circular imports', () => {
    writeFileSync(
      path.join(tmpDir, 'a.kin'),
      `injiza("b.kin")`,
    );
    writeFileSync(
      path.join(tmpDir, 'b.kin'),
      `injiza("a.kin")`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `injiza("a.kin")`,
    );

    try {
      runFile(path.join(tmpDir, 'main.kin'));
      throw new Error('expected K033');
    } catch (e) {
      expect(e).toBeInstanceOf(KinError);
      expect((e as KinError).code).toBe('K033');
    }
  });

  test('arity and type checks for injiza', () => {
    expect(() => evaluate('injiza()')).toThrow(/injiza expects at least one argument/);
    expect(() => evaluate('injiza(1)')).toThrow(/expects argument 1 to be string/);
  });

  test('imported top-level side effects run once', () => {
    writeFileSync(
      path.join(tmpDir, 'side.kin'),
      `tangaza_amakuru("loaded")`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("side.kin")
injiza("side.kin")
`,
    );

    runFile(path.join(tmpDir, 'main.kin'));
    expect(log.LogMessage).toHaveBeenCalledTimes(1);
    expect(log.LogMessage).toHaveBeenCalledWith('loaded');
  });

  test('absolute paths work', () => {
    const absUtils = path.join(tmpDir, 'abs-utils.kin');
    writeFileSync(absUtils, `reka abs_ok = "yego"`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `injiza("${absUtils.replace(/\\/g, '/')}")
reka v = abs_ok
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asString(env.lookupVar('v'))).toBe('yego');
  });
});
