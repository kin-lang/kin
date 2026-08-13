/*************************************************************************************************************
 *                                                   injiza                                                  *
 *  Load and run another .kin file in the program (root) environment so its bindings become available.       *
 *  Each absolute path is evaluated at most once per global environment (load-once). Circular imports throw. *
 *************************************************************************************************************/

import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import Parser from '../../../parser/parser';
import { createKinError, isKinError } from '../../../lib/errors';
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
 * Mark the entry script as already loaded so self-injiza of the entry file
 * is a no-op (does not re-run and redeclare bindings).
 * Seeds any real file path, regardless of extension.
 */
function ensureEntrySeeded(root: Environment): void {
  const loaded = loadedSet(root);
  const entry = path.resolve(resolveEntryFilename(root));
  try {
    if (existsSync(entry) && statSync(entry).isFile()) {
      loaded.add(entry);
    }
  } catch {
    // Ignore races / permission errors; import will fail later if needed.
  }
}

/**
 * Attach the imported file's source buffer so CLI frames point at the dependency.
 * Preserve attribution already set by a nested import (do not re-stamp outer files).
 */
function withImportContext(
  error: unknown,
  source: string,
  filename: string,
): never {
  if (isKinError(error)) {
    throw createKinError(error.code, {
      span: error.span,
      params: error.params,
      message: error.message,
      cause: error,
      source: error.source ?? source,
      filename: error.filename ?? filename,
    });
  }
  throw error;
}

/** Replace the contents of `target` with those of `snapshot`. */
function restoreSet(target: Set<string>, snapshot: Set<string>): void {
  target.clear();
  for (const value of snapshot) {
    target.add(value);
  }
}

export const injiza: NativeFnValue = defineNative({
  name: 'injiza',
  params: ['string'],
  maxArgs: 1,
  fn: (args, env) => {
    const requested = (args[0] as StringVal).value;
    const absolute = path.resolve(resolveKinPath(env, requested));
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
      if (!statSync(absolute).isFile()) {
        throw createKinError('K032', {
          params: { path: requested },
          message: `Cannot import '${requested}': file not found`,
        });
      }
      source = readFileSync(absolute, 'utf-8');
    } catch (error: unknown) {
      if (isKinError(error)) throw error;
      throw createKinError('K032', {
        params: { path: requested },
        message: `Cannot import '${requested}': file not found`,
        cause: error,
      });
    }

    // Snapshot program bindings AND the load-once set so a failed parent
    // import does not leave nested modules marked loaded while their
    // declarations were rolled back.
    // Rollback is binding-table only (not deep object/array mutations or I/O).
    const snapshot = root.captureLocals();
    const loadedSnapshot = new Set(loaded);
    loading.add(absolute);
    try {
      const parser = new Parser();
      let ast;
      try {
        ast = parser.produceAST(source);
      } catch (error: unknown) {
        withImportContext(error, source, absolute);
      }

      // Always evaluate in the root/program environment so nested call sites
      // (functions, niba, loops) still install shared top-level bindings.
      try {
        const result = withCurrentFile(absolute, () =>
          Interpreter.evaluate(ast, root),
        );
        loaded.add(absolute);
        return result;
      } catch (error: unknown) {
        root.restoreLocals(snapshot);
        restoreSet(loaded, loadedSnapshot);
        withImportContext(error, source, absolute);
      }
    } finally {
      loading.delete(absolute);
    }
  },
});
