import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as log from '../src/lib/log';
import { runSource } from '../src/runtime/run';

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

function runExample(filename: string): void {
  const filePath = path.join(EXAMPLES_DIR, filename);
  const source = readFileSync(filePath, 'utf-8');
  // runSource keeps parser + env type-safety modes aligned.
  runSource(source, { filename: filePath });
}

describe('Example programs (current language implementation)', () => {
  beforeEach(() => {
    promptAnswers.queue = [];
    vi.spyOn(log, 'LogMessage').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const examples = readdirSync(EXAMPLES_DIR)
    .filter((file) => file.endsWith('.kin'))
    .sort();

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
        'types.kin',
      ]),
    );
  });

  test.each(examples)('runs %s without throwing', (filename) => {
    promptAnswers.queue = [...(EXAMPLE_INPUTS[filename] ?? [])];
    expect(() => runExample(filename)).not.toThrow();
  });
});
