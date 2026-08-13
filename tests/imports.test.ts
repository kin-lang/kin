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
import { renderKinError } from '../src/lib/render-error';
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

function expectRunError(entryPath: string, code: string): KinError {
  try {
    runFile(entryPath);
  } catch (e) {
    expect(e).toBeInstanceOf(KinError);
    const err = e as KinError;
    expect(err.code).toBe(code);
    return err;
  }
  throw new Error(`expected KinError ${code}`);
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

  test('loads declarations and functions into the program environment', () => {
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
    writeFileSync(path.join(libDir, 'helper.kin'), `reka from_helper = 42`);
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
    writeFileSync(path.join(libDir, 'deep.kin'), `reka deep_val = 7`);
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
    writeFileSync(path.join(tmpDir, 'once.kin'), `reka counter = 1`);
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
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("missing.kin")`);
    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K032');
    expect(err.ERRNAME).toBe('RuntimeError');
    expect(err.ERRCODE).toBe('E_RUNTIME');
    expect(err.message).toMatch(/missing\.kin/);
  });

  test('throws K033 on circular imports', () => {
    writeFileSync(path.join(tmpDir, 'a.kin'), `injiza("b.kin")`);
    writeFileSync(path.join(tmpDir, 'b.kin'), `injiza("a.kin")`);
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("a.kin")`);
    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K033');
    expect(err.ERRNAME).toBe('RuntimeError');
    expect(err.ERRCODE).toBe('E_RUNTIME');
  });

  test('arity and type checks for injiza', () => {
    expect(() => evaluate('injiza()')).toThrow(
      /injiza expects at least one argument/,
    );
    expect(() => evaluate('injiza(1)')).toThrow(
      /expects argument 1 to be string/,
    );
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

  test('injiza from inside a function installs program-level bindings', () => {
    writeFileSync(path.join(tmpDir, 'lib.kin'), `reka shared = 99`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
porogaramu_ntoya load() {
  injiza("lib.kin")
}
load()
reka x = shared
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('x'))).toBe(99);
    expect(asNumber(env.lookupVar('shared'))).toBe(99);
  });

  test('injiza from niba / loop installs program-level bindings', () => {
    writeFileSync(path.join(tmpDir, 'cond.kin'), `reka from_cond = 1`);
    writeFileSync(path.join(tmpDir, 'loop.kin'), `reka from_loop = 2`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
niba (nibyo) {
  injiza("cond.kin")
}
reka i = 0
subiramo_niba (i < 1) {
  injiza("loop.kin")
  i = i + 1
}
reka total = from_cond + from_loop
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('total'))).toBe(3);
  });

  test('load-once from nested scope still exposes bindings at top level', () => {
    writeFileSync(path.join(tmpDir, 'once.kin'), `reka g = 7`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
porogaramu_ntoya load() {
  injiza("once.kin")
}
load()
injiza("once.kin")
reka v = g
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('v'))).toBe(7);
  });

  test('parse errors in imported files attribute to the dependency', () => {
    writeFileSync(path.join(tmpDir, 'bad.kin'), `reka =`);
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("bad.kin")`);

    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K002');
    expect(err.filename).toBe(path.resolve(tmpDir, 'bad.kin'));
    expect(err.source).toContain('reka =');
    const rendered = renderKinError(err, { color: false });
    expect(rendered).toMatch(/bad\.kin/);
    expect(rendered).toMatch(/reka =/);
  });

  test('runtime errors in imported files attribute to the dependency', () => {
    writeFileSync(path.join(tmpDir, 'rt.kin'), `tangaza_amakuru(missing_name)`);
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("rt.kin")`);

    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K005');
    expect(err.filename).toBe(path.resolve(tmpDir, 'rt.kin'));
    expect(err.source).toContain('missing_name');
    const rendered = renderKinError(err, { color: false });
    expect(rendered).toMatch(/rt\.kin/);
    expect(rendered).toMatch(/missing_name/);
  });

  test('failed import rolls back partial bindings so re-import can succeed', () => {
    writeFileSync(
      path.join(tmpDir, 'partial.kin'),
      `
reka a = 1
reka b = missing
`,
    );
    writeFileSync(
      path.join(tmpDir, 'fixed.kin'),
      `
reka a = 1
reka b = 2
`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
porogaramu_ntoya try_bad() {
  injiza("partial.kin")
}
# first import fails mid-file
reka failed = sibyo
niba (sibyo) {
}
# call via a path that surfaces the error then continues is hard in Kin;
# assert rollback via direct evaluate in this test helper below.
`,
    );

    // Direct: first injiza fails, second with fixed file works, `a` not polluted from partial.
    const entry = path.join(tmpDir, 'driver.kin');
    writeFileSync(entry, `reka ok = 0`);
    const env = createGlobalEnv(entry);
    withCurrentFile(path.resolve(entry), () => {
      try {
        Interpreter.evaluate(
          new Parser().produceAST(`injiza("partial.kin")`),
          env,
        );
        throw new Error('expected failure');
      } catch (e) {
        expect(e).toBeInstanceOf(KinError);
        expect((e as KinError).code).toBe('K005');
      }
      // Partial `a` must not remain.
      expect(() => env.lookupVar('a')).toThrow();
      Interpreter.evaluate(
        new Parser().produceAST(`injiza("fixed.kin")`),
        env,
      );
      expect(asNumber(env.lookupVar('a'))).toBe(1);
      expect(asNumber(env.lookupVar('b'))).toBe(2);
    });
  });

  test('self-injiza of entry without .kin extension is a no-op', () => {
    const entry = path.join(tmpDir, 'main.txt');
    writeFileSync(
      entry,
      `
reka x = 1
injiza("main.txt")
reka y = x + 1
`,
    );

    const env = runFile(entry);
    expect(asNumber(env.lookupVar('x'))).toBe(1);
    expect(asNumber(env.lookupVar('y'))).toBe(2);
  });

  test('self-injiza of .kin entry is a no-op', () => {
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
reka x = 5
injiza("main.kin")
reka y = x
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asNumber(env.lookupVar('y'))).toBe(5);
  });

  test('redeclaration across files raises K007', () => {
    writeFileSync(path.join(tmpDir, 'a.kin'), `reka shared = 1`);
    writeFileSync(path.join(tmpDir, 'b.kin'), `reka shared = 2`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("a.kin")
injiza("b.kin")
`,
    );

    expectRunError(path.join(tmpDir, 'main.kin'), 'K007');
  });

  test('KIN_INYANDIKO paths inside an imported file are relative to that file', () => {
    const libDir = path.join(tmpDir, 'lib');
    mkdirSync(libDir);
    writeFileSync(path.join(libDir, 'data.txt'), 'from-lib');
    writeFileSync(
      path.join(libDir, 'reader.kin'),
      `reka content = KIN_INYANDIKO.soma("data.txt")`,
    );
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("lib/reader.kin")
reka c = content
`,
    );

    const env = runFile(path.join(tmpDir, 'main.kin'));
    expect(asString(env.lookupVar('c'))).toBe('from-lib');
  });

  test('diamond import loads shared dependency once', () => {
    writeFileSync(
      path.join(tmpDir, 'core2.kin'),
      `tangaza_amakuru("core")`,
    );
    writeFileSync(path.join(tmpDir, 'left.kin'), `injiza("core2.kin")`);
    writeFileSync(path.join(tmpDir, 'right.kin'), `injiza("core2.kin")`);
    writeFileSync(
      path.join(tmpDir, 'main.kin'),
      `
injiza("left.kin")
injiza("right.kin")
`,
    );

    runFile(path.join(tmpDir, 'main.kin'));
    expect(log.LogMessage).toHaveBeenCalledTimes(1);
  });

  test('multi-hop parse errors attribute to the leaf file', () => {
    writeFileSync(path.join(tmpDir, 'bad.kin'), `reka =`);
    writeFileSync(path.join(tmpDir, 'mid.kin'), `injiza("bad.kin")`);
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("mid.kin")`);

    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K002');
    expect(err.filename).toBe(path.resolve(tmpDir, 'bad.kin'));
    expect(err.source).toContain('reka =');
    const rendered = renderKinError(err, { color: false });
    expect(rendered).toMatch(/bad\.kin/);
    expect(rendered).not.toMatch(/mid\.kin:1/);
  });

  test('multi-hop runtime errors attribute to the leaf file', () => {
    writeFileSync(path.join(tmpDir, 'leaf.kin'), `reka x = missing`);
    writeFileSync(path.join(tmpDir, 'mid.kin'), `injiza("leaf.kin")`);
    writeFileSync(path.join(tmpDir, 'a.kin'), `injiza("mid.kin")`);
    writeFileSync(path.join(tmpDir, 'main.kin'), `injiza("a.kin")`);

    const err = expectRunError(path.join(tmpDir, 'main.kin'), 'K005');
    expect(err.filename).toBe(path.resolve(tmpDir, 'leaf.kin'));
    expect(err.source).toContain('missing');
  });

  test('nested success then parent failure rolls back loaded set so child reloads', () => {
    writeFileSync(path.join(tmpDir, 'inner.kin'), `reka INNER = 1`);
    writeFileSync(
      path.join(tmpDir, 'outer.kin'),
      `
injiza("inner.kin")
reka boom = missing
`,
    );
    writeFileSync(
      path.join(tmpDir, 'outer_fixed.kin'),
      `
injiza("inner.kin")
reka OUTER = INNER + 1
`,
    );

    const entry = path.join(tmpDir, 'driver.kin');
    writeFileSync(entry, `reka ok = 0`);
    const env = createGlobalEnv(entry);
    withCurrentFile(path.resolve(entry), () => {
      try {
        Interpreter.evaluate(
          new Parser().produceAST(`injiza("outer.kin")`),
          env,
        );
        throw new Error('expected outer failure');
      } catch (e) {
        expect(e).toBeInstanceOf(KinError);
        expect((e as KinError).code).toBe('K005');
      }
      // Nested bindings must not remain.
      expect(() => env.lookupVar('INNER')).toThrow();
      // Child must not be stuck as "loaded"; re-import rebinds.
      Interpreter.evaluate(
        new Parser().produceAST(`injiza("inner.kin")`),
        env,
      );
      expect(asNumber(env.lookupVar('INNER'))).toBe(1);
      // Fixed parent re-import still works (inner already loaded once; outer adds OUTER).
      Interpreter.evaluate(
        new Parser().produceAST(`injiza("outer_fixed.kin")`),
        env,
      );
      expect(asNumber(env.lookupVar('OUTER'))).toBe(2);
    });
  });

  test('rollback is binding-table only (in-place object mutation survives)', () => {
    writeFileSync(
      path.join(tmpDir, 'mut.kin'),
      `
obj.a = 99
reka boom = missing
`,
    );
    const entry = path.join(tmpDir, 'driver.kin');
    writeFileSync(entry, `reka obj = { a: 1 }`);
    const env = createGlobalEnv(entry);
    withCurrentFile(path.resolve(entry), () => {
      Interpreter.evaluate(
        new Parser().produceAST(`reka obj = { a: 1 }`),
        env,
      );
      try {
        Interpreter.evaluate(
          new Parser().produceAST(`injiza("mut.kin")`),
          env,
        );
        throw new Error('expected failure');
      } catch (e) {
        expect(e).toBeInstanceOf(KinError);
      }
      const obj = env.lookupVar('obj');
      expect(obj.type).toBe('object');
      const a = (obj as { properties: Map<string, { value: number }> })
        .properties.get('a');
      expect(a?.value).toBe(99);
    });
  });
});
