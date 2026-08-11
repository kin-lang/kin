import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';
import moment from 'moment';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import { createGlobalEnv } from '../src/runtime/globals';
import {
  MK_NUMBER,
  MK_STRING,
  NativeFnValue,
  NumberVal,
  ObjectVal,
} from '../src/runtime/values';
import {
  asBool,
  asNumber,
  asObject,
  asString,
  evaluate,
  nativeFn,
  objectMethod,
} from './helpers';

const promptAnswers = vi.hoisted(() => ({
  queue: [] as Array<string | null>,
}));

vi.mock('prompt-sync', () => ({
  default: () => () => {
    if (promptAnswers.queue.length === 0) {
      return null;
    }
    return promptAnswers.queue.shift() ?? null;
  },
}));

describe('createGlobalEnv', () => {
  beforeEach(() => {
    promptAnswers.queue = [];
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('built-in variables', () => {
    test('exposes filename from the env constructor argument', () => {
      const { result } = evaluate('filename', 'examples/demo.kin');
      expect(asString(result)).toBe('examples/demo.kin');
    });

    test('exposes nibyo as boolean true', () => {
      const { result } = evaluate('nibyo');
      expect(asBool(result)).toBe(true);
    });

    test('exposes sibyo as boolean false', () => {
      const { result } = evaluate('sibyo');
      expect(asBool(result)).toBe(false);
    });

    test('exposes ubusa as null', () => {
      const { result } = evaluate('ubusa');
      expect(result.type).toBe('null');
    });

    test('exposes ikosa as a mutable null', () => {
      const { result } = evaluate(`
        ikosa = "kosa"
        ikosa
      `);
      expect(asString(result)).toBe('kosa');
    });

    test('does not allow reassignment of constant globals', () => {
      expect(() => evaluate('nibyo = sibyo')).toThrow(
        /Cannot reassign to variable "nibyo"/,
      );
      expect(() => evaluate('filename = "other.kin"')).toThrow(
        /Cannot reassign to variable "filename"/,
      );
    });
  });

  describe('tangaza_amakuru', () => {
    test('prints concatenated values and returns ubusa', () => {
      const { result } = evaluate('tangaza_amakuru("hello ", 1, " ", nibyo)');
      expect(result.type).toBe('null');
      expect(log.LogMessage).toHaveBeenCalledWith('hello 1 nibyo');
    });

    test('prints ubusa and sibyo using Kin words', () => {
      evaluate('tangaza_amakuru(ubusa, " ", sibyo)');
      expect(log.LogMessage).toHaveBeenCalledWith('ubusa sibyo');
    });

    test('accepts zero arguments and still prints an empty line', () => {
      const { result } = evaluate('tangaza_amakuru()');
      expect(result.type).toBe('null');
      expect(log.LogMessage).toHaveBeenCalledWith('');
    });
  });

  describe('sisitemu', () => {
    test('runs a system command and returns trimmed stdout', () => {
      const env = createGlobalEnv('test.kin');
      const sys = nativeFn(env, 'sisitemu');
      const result = sys.call([MK_STRING('echo ok')], env);
      expect(asString(result)).toBe('ok');
    });

    test('also works when invoked from Kin source', () => {
      const { result } = evaluate('sisitemu("echo kin")');
      expect(asString(result)).toBe('kin');
    });

    test('throws when the command exits non-zero', () => {
      const env = createGlobalEnv('test.kin');
      const sys = nativeFn(env, 'sisitemu');
      expect(() =>
        sys.call([MK_STRING('node -e "process.exit(1)"')], env),
      ).toThrow();
    });

    test('throws when called with no arguments', () => {
      expect(() => evaluate('sisitemu()')).toThrow(
        'sisitemu expects at least one argument',
      );
    });
  });

  describe('injiza_amakuru', () => {
    test('returns a number when the user types an integer', () => {
      promptAnswers.queue = ['42'];
      const { result } = evaluate('injiza_amakuru("n? ")');
      expect(asNumber(result)).toBe(42);
    });

    test('returns a number when the user types a float', () => {
      promptAnswers.queue = ['3.14'];
      const { result } = evaluate('injiza_amakuru("n? ")');
      expect(asNumber(result)).toBeCloseTo(3.14);
    });

    test('returns a string for non-numeric input', () => {
      promptAnswers.queue = ['Muraho'];
      const { result } = evaluate('injiza_amakuru("amazina? ")');
      expect(asString(result)).toBe('Muraho');
    });

    test('returns ubusa when input is null / EOF', () => {
      promptAnswers.queue = [null];
      const { result } = evaluate('injiza_amakuru("n? ")');
      expect(result.type).toBe('null');
    });

    test('joins multiple prompt arguments into one question', () => {
      promptAnswers.queue = ['yes'];
      const { result } = evaluate('injiza_amakuru("a", 1, "b")');
      expect(asString(result)).toBe('yes');
    });

    test('throws when called with no arguments', () => {
      expect(() => evaluate('injiza_amakuru()')).toThrow(
        'injiza_amakuru expects at least one argument',
      );
    });
  });

  describe('hagarara (process.exit native)', () => {
    // The lexer treats bare `hagarara` as the break keyword, so the exit
    // builtin is reachable only through the JS environment API.
    test('exits with code 0', () => {
      const env = createGlobalEnv('test.kin');
      const exit = nativeFn(env, 'hagarara');
      const spy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as () => never);

      exit.call([MK_NUMBER(0)], env);
      expect(spy).toHaveBeenCalledWith(0);
    });

    test('exits with code 1', () => {
      const env = createGlobalEnv('test.kin');
      const exit = nativeFn(env, 'hagarara');
      const spy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as () => never);

      exit.call([MK_NUMBER(1)], env);
      expect(spy).toHaveBeenCalledWith(1);
    });

    test('rejects missing arguments', () => {
      const env = createGlobalEnv('test.kin');
      const exit = nativeFn(env, 'hagarara');
      expect(() => exit.call([], env)).toThrow(
        'sisitemu expects atleast one argument',
      );
    });

    test('rejects exit codes other than 0 or 1', () => {
      const env = createGlobalEnv('test.kin');
      const exit = nativeFn(env, 'hagarara');
      expect(() => exit.call([MK_NUMBER(2)], env)).toThrow(
        'hagarara expects 1 or 0 as exit codes',
      );
    });
  });

  describe('KIN_IMIBARE', () => {
    test('exposes pi as Math.PI', () => {
      const { result } = evaluate('KIN_IMIBARE.pi');
      expect(asNumber(result)).toBe(Math.PI);
    });

    test('umuzikare returns the square root', () => {
      expect(asNumber(evaluate('KIN_IMIBARE.umuzikare(9)').result)).toBe(3);
      expect(asNumber(evaluate('KIN_IMIBARE.umuzikare(0)').result)).toBe(0);
    });

    test('umuzikare requires a number argument', () => {
      expect(() => evaluate('KIN_IMIBARE.umuzikare()')).toThrow(
        'KIN_IMIBARE.umuzikare expects atleast one argument',
      );
    });

    test('umubare_utazwi returns an integer in the inclusive range', () => {
      for (let i = 0; i < 20; i++) {
        const value = asNumber(
          evaluate('KIN_IMIBARE.umubare_utazwi(2, 5)').result,
        );
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(5);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    test('umubare_utazwi requires two arguments', () => {
      expect(() => evaluate('KIN_IMIBARE.umubare_utazwi(1)')).toThrow(
        'KIN_IMIBARE.umubare_utazwi expects at least two arguments',
      );
    });

    test('umubare_utazwi rejects non-number values', () => {
      const env = createGlobalEnv('test.kin');
      const random = objectMethod(env, 'KIN_IMIBARE', 'umubare_utazwi');
      expect(() => random.call([MK_STRING('a'), MK_STRING('b')], env)).toThrow(
        "KIN_IMIBARE.umubare_utazwi expects 2 arguments of type 'number'",
      );
    });

    test('kuraho_ibice rounds to the nearest integer', () => {
      expect(asNumber(evaluate('KIN_IMIBARE.kuraho_ibice(3.6)').result)).toBe(
        4,
      );
      expect(asNumber(evaluate('KIN_IMIBARE.kuraho_ibice(3.4)').result)).toBe(
        3,
      );
    });

    test('kuraho_ibice validates arguments', () => {
      expect(() => evaluate('KIN_IMIBARE.kuraho_ibice()')).toThrow(
        'KIN_IMIBARE.kuraho_ibice expects at least one argument',
      );
      expect(() => evaluate('KIN_IMIBARE.kuraho_ibice("x")')).toThrow(
        'KIN_IMIBARE.kuraho_ibice expects a number as an argument',
      );
    });

    test('sin / cos / tan match Math.*', () => {
      expect(asNumber(evaluate('KIN_IMIBARE.sin(0)').result)).toBe(0);
      expect(asNumber(evaluate('KIN_IMIBARE.cos(0)').result)).toBe(1);
      expect(asNumber(evaluate('KIN_IMIBARE.tan(0)').result)).toBe(0);
      expect(
        asNumber(evaluate(`KIN_IMIBARE.sin(${Math.PI / 2})`).result),
      ).toBeCloseTo(1);
    });

    test('trig functions validate arguments', () => {
      expect(() => evaluate('KIN_IMIBARE.sin()')).toThrow(
        'KIN_IMIBARE.sin expects at least one argument',
      );
      expect(() => evaluate('KIN_IMIBARE.sin("x")')).toThrow(
        'KIN_IMIBARE.sin expects a number as an argument',
      );
      expect(() => evaluate('KIN_IMIBARE.cos()')).toThrow(
        'KIN_IMIBARE.cos expects at least one argument',
      );
      expect(() => evaluate('KIN_IMIBARE.cos("x")')).toThrow(
        'KIN_IMIBARE.cos expects a number as an argument',
      );
      expect(() => evaluate('KIN_IMIBARE.tan()')).toThrow(
        'KIN_IMIBARE.tan expects at least one argument',
      );
      expect(() => evaluate('KIN_IMIBARE.tan("x")')).toThrow(
        'KIN_IMIBARE.tan expects a number as an argument',
      );
    });
  });

  describe('KIN_AMAGAMBO', () => {
    test('huza concatenates all string arguments', () => {
      expect(
        asString(evaluate('KIN_AMAGAMBO.huza("a", "b", "c")').result),
      ).toBe('abc');
    });

    test('huza with no arguments returns an empty string', () => {
      expect(asString(evaluate('KIN_AMAGAMBO.huza()').result)).toBe('');
    });

    test('ingano returns the string length', () => {
      expect(asNumber(evaluate('KIN_AMAGAMBO.ingano("kin")').result)).toBe(3);
    });

    test('ingano validates arguments', () => {
      expect(() => evaluate('KIN_AMAGAMBO.ingano()')).toThrow(
        'KIN_AMAGAMBO.ingano expects at least one argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.ingano(1)')).toThrow(
        'KIN_AMAGAMBO.ingano expects string as an argument',
      );
    });

    test('inyuguti returns the character at an index', () => {
      expect(asString(evaluate('KIN_AMAGAMBO.inyuguti("kin", 1)').result)).toBe(
        'i',
      );
    });

    test('inyuguti returns an empty string for an out-of-range index', () => {
      expect(asString(evaluate('KIN_AMAGAMBO.inyuguti("kin", 9)').result)).toBe(
        '',
      );
    });

    test('inyuguti validates arguments', () => {
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti("kin")')).toThrow(
        'KIN_AMAGAMBO.inyuguti expects at least two argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti(1, 0)')).toThrow(
        'first argument of KIN_AMABAMBO.inyuguti must be a string',
      );
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti("kin", "0")')).toThrow(
        'second argument of KIN_AMABAMBO.inyuguti must be a number',
      );
    });

    test('inyuguti_nkuru uppercases a string', () => {
      expect(
        asString(evaluate('KIN_AMAGAMBO.inyuguti_nkuru("Kin")').result),
      ).toBe('KIN');
    });

    test('inyuguti_ntoya lowercases a string', () => {
      expect(
        asString(evaluate('KIN_AMAGAMBO.inyuguti_ntoya("Kin")').result),
      ).toBe('kin');
    });

    test('case helpers validate arguments', () => {
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti_nkuru()')).toThrow(
        'KIN_AMAGAMBO.inyuguti_nkuru expects at least one argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti_nkuru(1)')).toThrow(
        'KIN_AMAGAMBO.inyuguti_nkuru expect a string as an argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti_ntoya()')).toThrow(
        'KIN_AMAGAMBO.inyuguti_ntoya expects at least one argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.inyuguti_ntoya(1)')).toThrow(
        'KIN_AMAGAMBO.inyuguti_ntoya expect a string as an argument',
      );
    });

    test('tandukanya splits a string into an object keyed by index', () => {
      const { result } = evaluate('KIN_AMAGAMBO.tandukanya("a,b,c", ",")');
      const obj = asObject(result);
      expect(obj.properties.size).toBe(3);
      expect(asString(obj.properties.get('0')!)).toBe('a');
      expect(asString(obj.properties.get('1')!)).toBe('b');
      expect(asString(obj.properties.get('2')!)).toBe('c');
    });

    test('tandukanya result is readable from Kin with numeric indexes', () => {
      expect(
        asString(
          evaluate(`
            reka parts = KIN_AMAGAMBO.tandukanya("a-b", "-")
            parts[1]
          `).result,
        ),
      ).toBe('b');
    });

    test('tandukanya validates arguments', () => {
      expect(() => evaluate('KIN_AMAGAMBO.tandukanya("a")')).toThrow(
        'KIN_AMAGAMBO.tangukanya expects at least two argument',
      );
      expect(() => evaluate('KIN_AMAGAMBO.tandukanya(1, ",")')).toThrow(
        'KIN_AMAGAMBO.tandukanya expects 2 arguments to be strings',
      );
    });
  });

  describe('KIN_IGIHE', () => {
    test('isaha returns the current time as HH:mm:ss', () => {
      const { result } = evaluate('KIN_IGIHE.isaha()');
      const got = asString(result);
      expect(got).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      const nearby = [
        moment().subtract(1, 'second').format('HH:mm:ss'),
        moment().format('HH:mm:ss'),
        moment().add(1, 'second').format('HH:mm:ss'),
      ];
      expect(nearby).toContain(got);
    });

    test('umunsi returns the current weekday name', () => {
      const { result } = evaluate('KIN_IGIHE.umunsi()');
      expect(asString(result)).toBe(moment().format('dddd'));
    });

    test('itariki returns the current date as Do MMM YY', () => {
      const { result } = evaluate('KIN_IGIHE.itariki()');
      expect(asString(result)).toBe(moment().format('Do MMM YY'));
    });
  });

  describe('KIN_URUTONDE', () => {
    test('ingano returns the number of elements', () => {
      expect(asNumber(evaluate('KIN_URUTONDE.ingano([1, 2, 3])').result)).toBe(
        3,
      );
    });

    test('ingano requires an argument', () => {
      expect(() => evaluate('KIN_URUTONDE.ingano()')).toThrow(
        'KIN_URUTONDE.ingano expects at least one argument',
      );
    });

    test('ongera_kumusozo appends a value and returns the new size', () => {
      const { result } = evaluate(`
        reka arr = [1, 2]
        KIN_URUTONDE.ongera_kumusozo(arr, 3)
        arr
      `);
      const arr = asObject(result);
      expect(arr.properties.size).toBe(3);
      expect(asNumber(arr.properties.get('2')!)).toBe(3);
    });

    test('ongera_kumusozo requires two arguments', () => {
      expect(() => evaluate('KIN_URUTONDE.ongera_kumusozo([1])')).toThrow(
        'KIN_URUTONDE.ongera_kumusozo expects at least two arguments',
      );
    });

    test('siba_kumusozo removes the last element and returns the new size', () => {
      const { result } = evaluate(`
        reka arr = [1, 2, 3]
        reka size = KIN_URUTONDE.siba_kumusozo(arr)
        size
      `);
      expect(asNumber(result)).toBe(2);
    });

    test('siba_kumusozo requires an argument', () => {
      expect(() => evaluate('KIN_URUTONDE.siba_kumusozo()')).toThrow(
        'KIN_URUTONDE.siba_kumusozo expects at least one argument',
      );
    });

    test('ifite_ikirango reports whether a key exists', () => {
      expect(
        asBool(evaluate('KIN_URUTONDE.ifite_ikirango([10, 20], "0")').result),
      ).toBe(true);
      expect(
        asBool(evaluate('KIN_URUTONDE.ifite_ikirango([10, 20], "9")').result),
      ).toBe(false);
    });

    test('ifite_ikirango requires two arguments', () => {
      expect(() => evaluate('KIN_URUTONDE.ifite_ikirango([1])')).toThrow(
        'KIN_URUTONDE.ifite_ikirango expects at least two arguments',
      );
    });

    test('ifite reports whether the first value equals the needle', () => {
      // Current implementation only inspects the first element.
      expect(
        asBool(evaluate('KIN_URUTONDE.ifite(["a", "b"], "a")').result),
      ).toBe(true);
      expect(
        asBool(evaluate('KIN_URUTONDE.ifite(["a", "b"], "b")').result),
      ).toBe(false);
    });

    test('ifite requires two arguments', () => {
      expect(() => evaluate('KIN_URUTONDE.ifite([1])')).toThrow(
        'KIN_URUTONDE.ifite expects at least two arguments',
      );
    });

    test('kora_ijambo joins element values into a string', () => {
      expect(
        asString(evaluate('KIN_URUTONDE.kora_ijambo(["k", "i", "n"])').result),
      ).toBe('kin');
      expect(
        asString(evaluate('KIN_URUTONDE.kora_ijambo([1, 2])').result),
      ).toBe('12');
    });

    test('kora_ijambo requires an argument', () => {
      expect(() => evaluate('KIN_URUTONDE.kora_ijambo()')).toThrow(
        'KIN_URUTONDE.kora_ijambo expects at least one argument',
      );
    });

    test('injiza_ahabanza prepends a value and returns a new array', () => {
      const { result } = evaluate(`
        reka arr = [2, 3]
        reka next = KIN_URUTONDE.injiza_ahabanza(arr, 1)
        next
      `);
      const next = asObject(result);
      expect(asNumber(next.properties.get('0')!)).toBe(1);
      expect(asNumber(next.properties.get('1')!)).toBe(2);
      expect(asNumber(next.properties.get('2')!)).toBe(3);
    });

    test('injiza_ahabanza does not mutate the original array', () => {
      const { result } = evaluate(`
        reka arr = [2, 3]
        KIN_URUTONDE.injiza_ahabanza(arr, 1)
        KIN_URUTONDE.ingano(arr)
      `);
      expect(asNumber(result)).toBe(2);
    });

    test('injiza_ahabanza requires two arguments', () => {
      expect(() => evaluate('KIN_URUTONDE.injiza_ahabanza([1])')).toThrow(
        'KIN_URUTONDE.injiza_ahabanza expects at least two arguments',
      );
    });

    test('siba_ahabanza drops the first element and reindexes', () => {
      const { result } = evaluate(`
        reka arr = [1, 2, 3]
        KIN_URUTONDE.siba_ahabanza(arr)
      `);
      const next = asObject(result);
      expect(next.properties.size).toBe(2);
      expect(asNumber(next.properties.get('0')!)).toBe(2);
      expect(asNumber(next.properties.get('1')!)).toBe(3);
    });

    test('siba_ahabanza requires an argument', () => {
      expect(() => evaluate('KIN_URUTONDE.siba_ahabanza()')).toThrow(
        'KIN_URUTONDE.siba_ahabanza expects at least one argument',
      );
    });
  });

  describe('ubwoko', () => {
    test('returns the runtime type name', () => {
      expect(asString(evaluate('ubwoko(1)').result)).toBe('number');
      expect(asString(evaluate('ubwoko("kin")').result)).toBe('string');
      expect(asString(evaluate('ubwoko(nibyo)').result)).toBe('boolean');
      expect(asString(evaluate('ubwoko(ubusa)').result)).toBe('null');
      expect(asString(evaluate('ubwoko([1])').result)).toBe('object');
      expect(asString(evaluate('ubwoko(tangaza_amakuru)').result)).toBe(
        'native-fn',
      );
      expect(
        asString(
          evaluate(`
            porogaramu_ntoya f() { tanga 1 }
            ubwoko(f)
          `).result,
        ),
      ).toBe('fn');
    });

    test('requires an argument', () => {
      expect(() => evaluate('ubwoko()')).toThrow(
        'ubwoko expects at least one argument',
      );
    });
  });

  describe('KIN_INYANDIKO', () => {
    let tmpDir: string;
    let filename: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(path.join(os.tmpdir(), 'kin-globals-'));
      // File builtins resolve paths as dirname(cwd + filename), so the
      // Kin filename must be relative to process.cwd().
      filename = path.relative(process.cwd(), path.join(tmpDir, 'prog.kin'));
      writeFileSync(path.join(tmpDir, 'prog.kin'), '');
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test('andika writes a file and soma reads it back', () => {
      const { result } = evaluate(
        `
          KIN_INYANDIKO.andika("out.txt", "muraho")
          KIN_INYANDIKO.soma("out.txt")
        `,
        filename,
      );
      expect(asString(result)).toBe('muraho');
      expect(readFileSync(path.join(tmpDir, 'out.txt'), 'utf-8')).toBe(
        'muraho',
      );
    });

    test('andika returns boolean true on success', () => {
      const { result } = evaluate(
        'KIN_INYANDIKO.andika("out.txt", "x")',
        filename,
      );
      expect(asBool(result)).toBe(true);
    });

    test('vugurura appends to an existing file', () => {
      evaluate(
        `
          KIN_INYANDIKO.andika("out.txt", "hello")
          KIN_INYANDIKO.vugurura("out.txt", " kin")
        `,
        filename,
      );
      expect(readFileSync(path.join(tmpDir, 'out.txt'), 'utf-8')).toBe(
        'hello kin',
      );
    });

    test('vugurura creates the file when it does not exist', () => {
      evaluate('KIN_INYANDIKO.vugurura("new.txt", "fresh")', filename);
      expect(readFileSync(path.join(tmpDir, 'new.txt'), 'utf-8')).toBe('fresh');
    });

    test('siba deletes a file', () => {
      writeFileSync(path.join(tmpDir, 'gone.txt'), 'x');
      const { result } = evaluate('KIN_INYANDIKO.siba("gone.txt")', filename);
      expect(asBool(result)).toBe(true);
      expect(existsSync(path.join(tmpDir, 'gone.txt'))).toBe(false);
    });

    test('soma returns an error string when the file is missing', () => {
      const { result } = evaluate(
        'KIN_INYANDIKO.soma("missing.txt")',
        filename,
      );
      expect(result.type).toBe('string');
      expect(asString(result).length).toBeGreaterThan(0);
    });

    test('siba returns an error string when the file is missing', () => {
      const { result } = evaluate(
        'KIN_INYANDIKO.siba("missing.txt")',
        filename,
      );
      expect(result.type).toBe('string');
    });

    test('validates argument counts', () => {
      expect(() => evaluate('KIN_INYANDIKO.soma()', filename)).toThrow(
        'KIN_INYANDIKO.soma expects at least one argument',
      );
      expect(() => evaluate('KIN_INYANDIKO.andika("f.txt")', filename)).toThrow(
        'KIN_URUTONDE.andika expects at least two arguments',
      );
      expect(() =>
        evaluate('KIN_INYANDIKO.vugurura("f.txt")', filename),
      ).toThrow('KIN_URUTONDE.vugurura expects at least two arguments');
      expect(() => evaluate('KIN_INYANDIKO.siba()', filename)).toThrow(
        'KIN_URUTONDE.siba expects at least one argument',
      );
    });

    test('andika can be used to overwrite existing content', () => {
      appendFileSync(path.join(tmpDir, 'out.txt'), 'old');
      evaluate('KIN_INYANDIKO.andika("out.txt", "new")', filename);
      expect(readFileSync(path.join(tmpDir, 'out.txt'), 'utf-8')).toBe('new');
    });
  });

  describe('environment shape', () => {
    test('registers every public builtin on a fresh global env', () => {
      const env = createGlobalEnv('test.kin');
      const expected = [
        'filename',
        'nibyo',
        'sibyo',
        'ubusa',
        'ikosa',
        'tangaza_amakuru',
        'sisitemu',
        'injiza_amakuru',
        'hagarara',
        'KIN_IMIBARE',
        'KIN_AMAGAMBO',
        'KIN_IGIHE',
        'KIN_URUTONDE',
        'ubwoko',
        'KIN_INYANDIKO',
      ];

      for (const name of expected) {
        expect(() => env.lookupVar(name)).not.toThrow();
      }
    });

    test('math / string / time / list / file objects expose their methods', () => {
      const env = createGlobalEnv('test.kin');
      const methods: Record<string, string[]> = {
        KIN_IMIBARE: [
          'pi',
          'umuzikare',
          'umubare_utazwi',
          'kuraho_ibice',
          'sin',
          'cos',
          'tan',
        ],
        KIN_AMAGAMBO: [
          'huza',
          'ingano',
          'inyuguti',
          'inyuguti_nkuru',
          'inyuguti_ntoya',
          'tandukanya',
        ],
        KIN_IGIHE: ['isaha', 'umunsi', 'itariki'],
        KIN_URUTONDE: [
          'ingano',
          'ongera_kumusozo',
          'siba_kumusozo',
          'ifite_ikirango',
          'ifite',
          'kora_ijambo',
          'injiza_ahabanza',
          'siba_ahabanza',
        ],
        KIN_INYANDIKO: ['soma', 'andika', 'vugurura', 'siba'],
      };

      for (const [objectName, keys] of Object.entries(methods)) {
        const obj = env.lookupVar(objectName) as ObjectVal;
        expect(obj.type).toBe('object');
        for (const key of keys) {
          expect(obj.properties.has(key)).toBe(true);
        }
      }

      expect(
        (env.lookupVar('KIN_IMIBARE') as ObjectVal).properties.get('pi')?.type,
      ).toBe('number');
      expect(
        (
          (env.lookupVar('KIN_IMIBARE') as ObjectVal).properties.get(
            'pi',
          ) as NumberVal
        ).value,
      ).toBe(Math.PI);
    });

    test('standalone builtins are native functions', () => {
      const env = createGlobalEnv('test.kin');
      for (const name of [
        'tangaza_amakuru',
        'sisitemu',
        'injiza_amakuru',
        'hagarara',
        'ubwoko',
      ]) {
        expect((env.lookupVar(name) as NativeFnValue).type).toBe('native-fn');
      }
    });
  });
});
