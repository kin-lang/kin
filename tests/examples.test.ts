import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
import { withCurrentFile } from '../src/runtime/path-resolve';

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

/** stdin answers for examples that call injiza_amakuru */
const EXAMPLE_INPUTS: Record<string, string[]> = {
  'io.kin': ['hello', 'world'],
  'switch.kin': ['a'],
};

/** Collect .kin entry files: top-level plus known multi-file entrypoints. */
function listExampleEntries(): string[] {
  const top = readdirSync(EXAMPLES_DIR)
    .filter((file) => file.endsWith('.kin'))
    .sort();
  const nested: string[] = [];
  for (const name of readdirSync(EXAMPLES_DIR)) {
    const full = path.join(EXAMPLES_DIR, name);
    if (statSync(full).isDirectory() && name === 'imports') {
      nested.push(path.join(name, 'main.kin'));
    }
  }
  return [...top, ...nested];
}

function runExample(relativePath: string): void {
  const filePath = path.join(EXAMPLES_DIR, relativePath);
  const source = readFileSync(filePath, 'utf-8');
  const parser = new Parser();
  const ast = parser.produceAST(source);
  const env = createGlobalEnv(filePath);
  withCurrentFile(path.resolve(filePath), () => {
    Interpreter.evaluate(ast, env);
  });
}

describe('Example programs (current language implementation)', () => {
  beforeEach(() => {
    promptAnswers.queue = [];
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const examples = listExampleEntries();

  test('discovers at least the shipped example programs', () => {
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
        'imports/main.kin',
      ]),
    );
  });

  test.each(examples)('runs %s without throwing', (filename) => {
    const base = path.basename(filename);
    promptAnswers.queue = [...(EXAMPLE_INPUTS[base] ?? [])];
    expect(() => runExample(filename)).not.toThrow();
  });
});
