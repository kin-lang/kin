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

/** stdin answers for examples that call injiza_amakuru */
const EXAMPLE_INPUTS: Record<string, string[]> = {
  'io.kin': ['hello', 'world'],
  'switch.kin': ['a'],
};

/** Recursively collect .kin files under examples/ (relative paths). */
function collectKinFiles(dir: string, prefix = ''): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectKinFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile() && entry.name.endsWith('.kin')) {
      files.push(rel);
    }
  }
  return files.sort();
}

function runExample(filename: string): void {
  const filePath = path.join(EXAMPLES_DIR, filename);
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

  const examples = collectKinFiles(EXAMPLES_DIR);

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
        'oop/class-basics.kin',
        'oop/inheritance.kin',
        'oop/instances-and-binding.kin',
        'oop/types-and-ubwoko.kin',
        'oop/visibility.kin',
      ]),
    );
  });

  test.each(examples)('runs %s without throwing', (filename) => {
    promptAnswers.queue = [...(EXAMPLE_INPUTS[filename] ?? [])];
    expect(() => runExample(filename)).not.toThrow();
  });
});
