/*************************************************************************************************************
 *                                                   injiza                                                  *
 *  Load and run another .kin file in the caller's environment so its bindings become available.             *
 *  Each absolute path is evaluated at most once per global environment (load-once). Circular imports throw. *
 *************************************************************************************************************/

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import Parser from '../../../parser/parser';
import { createKinError } from '../../../lib/errors';
import Environment from '../../environment';
import { Interpreter } from '../../interpreter';
import { defineNative } from '../../native';
import {
  resolveEntryFilename,
  resolveKinPath,
  withCurrentFile,
} from '../../path-resolve';
import { MK_NULL, NativeFnValue, StringVal } from '../../values';

/** Absolute paths already fully evaluated for a given root environment. */
const loadedByRoot = new WeakMap<Environment, Set<string>>();

/** Absolute paths currently mid-evaluation (for cycle detection). */
const loadingByRoot = new WeakMap<Environment, Set<string>>();

function loadedSet(root: Environment): Set<string> {
  let set = loadedByRoot.get(root);
  if (!set) {
    set = new Set();
    loadedByRoot.set(root, set);
  }
  return set;
}

function loadingSet(root: Environment): Set<string> {
  let set = loadingByRoot.get(root);
  if (!set) {
    set = new Set();
    loadingByRoot.set(root, set);
  }
  return set;
}

/**
 * Ensure the entry script is on the loaded set so a file cannot injiza itself
 * as a "fresh" load after already running as the entry point.
 */
function ensureEntrySeeded(root: Environment): void {
  const loaded = loadedSet(root);
  const entry = resolveEntryFilename(root);
  // Only seed when we are evaluating under that entry file (not REPL cwd alone).
  if (existsSync(entry) && entry.endsWith('.kin')) {
    loaded.add(entry);
  }
}

export const injiza: NativeFnValue = defineNative({
  name: 'injiza',
  params: ['string'],
  maxArgs: 1,
  fn: (args, env) => {
    const requested = (args[0] as StringVal).value;
    const absolute = path.normalize(resolveKinPath(env, requested));
    const root = env.getRoot();

    ensureEntrySeeded(root);

    const loaded = loadedSet(root);
    if (loaded.has(absolute)) {
      return MK_NULL();
    }

    const loading = loadingSet(root);
    if (loading.has(absolute)) {
      throw createKinError('K033', {
        params: { path: requested },
        message: `Circular import detected for '${requested}'`,
      });
    }

    if (!existsSync(absolute)) {
      throw createKinError('K032', {
        params: { path: requested },
        message: `Cannot import '${requested}': file not found`,
      });
    }

    let source: string;
    try {
      source = readFileSync(absolute, 'utf-8');
    } catch (error: unknown) {
      throw createKinError('K032', {
        params: { path: requested },
        message: `Cannot import '${requested}': file not found`,
        cause: error,
      });
    }

    loading.add(absolute);
    try {
      const parser = new Parser();
      const ast = parser.produceAST(source);

      // Same environment: declarations and functions in the imported file
      // become visible to the caller (and vice versa for free variables).
      const result = withCurrentFile(absolute, () =>
        Interpreter.evaluate(ast, env),
      );

      loaded.add(absolute);
      return result;
    } finally {
      loading.delete(absolute);
    }
  },
});
