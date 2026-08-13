import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';

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

const EXAMPLES_DIR = path.join(process.cwd(), 'examples');
const OOP_DIR = path.join(EXAMPLES_DIR, 'oop');

/** stdin answers for examples that call injiza_amakuru (keyed by relative path) */
const EXAMPLE_INPUTS: Record<string, string[]> = {
  'io.kin': ['hello', 'world'],
  'switch.kin': ['a'],
};

/** Collect .kin files under examples/ and examples/oop/ as relative paths. */
function listExamplePaths(): string[] {
  const top = readdirSync(EXAMPLES_DIR)
    .filter((file) => file.endsWith('.kin'))
    .sort();
  const oop = readdirSync(OOP_DIR)
    .filter((file) => file.endsWith('.kin'))
    .map((file) => path.join('oop', file))
    .sort();
  return [...top, ...oop];
}

function runExample(relativePath: string): void {
  const filePath = path.join(EXAMPLES_DIR, relativePath);
  const source = readFileSync(filePath, 'utf-8');
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const env = createGlobalEnv(filePath);
  Interpreter.evaluate(ast, env);
}

describe('Example programs (current language implementation)', () => {
  beforeEach(() => {
    promptAnswers.queue = [];
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const examples = listExamplePaths();

  test('discovers top-level and oop example programs', () => {
    expect(examples.length).toBeGreaterThan(0);
    expect(examples).toEqual(
      expect.arrayContaining([
        'arrays.kin',
        'conditional-statement.kin',
        'functions.kin',
        'io.kin',
        'loops.kin',
        'objects.kin',
        'switch.kin',
        'types.kin',
        'oop/class-basics.kin',
        'oop/visibility.kin',
        'oop/inheritance.kin',
        'oop/instances-and-binding.kin',
        'oop/types-and-ubwoko.kin',
      ]),
    );
  });

  test.each(examples)('runs %s without throwing', (relativePath) => {
    const base = path.basename(relativePath);
    promptAnswers.queue = [
      ...(EXAMPLE_INPUTS[relativePath] ?? EXAMPLE_INPUTS[base] ?? []),
    ];
    expect(() => runExample(relativePath)).not.toThrow();
  });
});
