/*************************************************************************************************************
 *                                              Modules (koresha)                                            *
 *  koresha "./file.kin" nka alias  — load module, bind exports as a namespace object.                       *
 *  emerera_gukoresha { a, b }      — mark names for export from the current module.                         *
 *************************************************************************************************************/

import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import Parser from '../parser/parser';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';
import Environment from './environment';
import { Interpreter } from './interpreter';
import {
  resolveEntryFilename,
  resolveKinPath,
  withCurrentFile,
} from './path-resolve';
import {
  MK_NULL,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
  RuntimeVal,
} from './values';

export interface ModuleRecord {
  path: string;
  /** Namespace object: properties are exported values. */
  exports: ObjectVal;
  /** Type aliases exported (if any) — available for future cross-module types. */
  exportedTypes: Map<string, import('./types').ResolvedType>;
}

/** Cache of fully loaded modules per program root environment. */
const modulesByRoot = new WeakMap<Environment, Map<string, ModuleRecord>>();

/** Paths currently loading (cycle detection) per root. */
const loadingByRoot = new WeakMap<Environment, Set<string>>();

/**
 * Export names registered while evaluating a module (via emerera_gukoresha).
 * Keyed by the module environment (not root).
 */
const pendingExports = new WeakMap<Environment, string[]>();

function moduleCache(root: Environment): Map<string, ModuleRecord> {
  let map = modulesByRoot.get(root);
  if (!map) {
    map = new Map();
    modulesByRoot.set(root, map);
  }
  return map;
}

function loadingSet(root: Environment): Set<string> {
  let set = loadingByRoot.get(root);
  if (!set) {
    set = new Set();
    loadingByRoot.set(root, set);
  }
  return set;
}

/** Mark the entry script so it is not re-loaded if koresha'd. */
function ensureEntrySeeded(root: Environment): void {
  const cache = moduleCache(root);
  const entry = path.resolve(resolveEntryFilename(root));
  try {
    if (existsSync(entry) && statSync(entry).isFile() && !cache.has(entry)) {
      // Entry is not a ModuleRecord unless it was loaded as a module.
      // Only seed the loading set indirectly via loaded paths on re-import.
    }
  } catch {
    // ignore
  }
}

/**
 * Register export names for the current module environment.
 * Names are resolved when the module finishes loading (or immediately if
 * called after bindings exist — we resolve at end of load for flexibility).
 */
export function registerExports(
  moduleEnv: Environment,
  names: string[],
  span?: Span,
): RuntimeVal {
  const list = pendingExports.get(moduleEnv) ?? [];
  for (const name of names) {
    if (!list.includes(name)) list.push(name);
  }
  pendingExports.set(moduleEnv, list);
  // Validate that names currently exist (samples put export after defs).
  for (const name of names) {
    try {
      moduleEnv.lookupVar(name);
    } catch {
      // Type-only names (ubwoko aliases) live in the type map.
      if (!moduleEnv.lookupType(name)) {
        throw createKinError('K046', {
          span,
          params: { name },
          message: `Cannot export '${name}': it is not defined in this module`,
        });
      }
    }
  }
  return MK_NULL();
}

function collectExports(moduleEnv: Environment): {
  values: Map<string, RuntimeVal>;
  types: Map<string, import('./types').ResolvedType>;
} {
  const names = pendingExports.get(moduleEnv) ?? [];
  const values = new Map<string, RuntimeVal>();
  const types = new Map<string, import('./types').ResolvedType>();

  for (const name of names) {
    try {
      values.set(name, moduleEnv.lookupVar(name));
    } catch {
      // value missing
    }
    const t = moduleEnv.lookupType(name);
    if (t) types.set(name, t);
    if (!values.has(name) && !types.has(name)) {
      throw createKinError('K046', {
        params: { name },
        message: `Cannot export '${name}': it is not defined in this module`,
      });
    }
  }

  return { values, types };
}

/**
 * Load a module (or return cached), evaluate it, and return its export object.
 */
export function loadModule(
  importerEnv: Environment,
  requestedPath: string,
  span?: Span,
): ModuleRecord {
  const root = importerEnv.getRoot();
  ensureEntrySeeded(root);

  const absolute = path.resolve(resolveKinPath(importerEnv, requestedPath));
  const cache = moduleCache(root);

  if (cache.has(absolute)) {
    return cache.get(absolute)!;
  }

  const loading = loadingSet(root);
  if (loading.has(absolute)) {
    throw createKinError('K045', {
      span,
      params: { path: requestedPath },
      message: `Circular import detected for '${requestedPath}'`,
    });
  }

  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    throw createKinError('K044', {
      span,
      params: { path: requestedPath },
      message: `Cannot import '${requestedPath}': file not found`,
    });
  }

  let source: string;
  try {
    source = readFileSync(absolute, 'utf-8');
  } catch {
    throw createKinError('K044', {
      span,
      params: { path: requestedPath },
      message: `Cannot import '${requestedPath}': file not readable`,
    });
  }

  loading.add(absolute);

  // Fresh module environment: inherits builtins from root, own bindings stay local.
  const moduleEnv = new Environment(root);
  moduleEnv.declareVar('filename', MK_STRING(absolute), true);
  pendingExports.set(moduleEnv, []);

  try {
    const parser = new Parser();
    const program = parser.produceAST(source);

    withCurrentFile(absolute, () => {
      Interpreter.evaluate(program, moduleEnv);
    });

    const { values, types } = collectExports(moduleEnv);
    const exportsObj = MK_OBJECT(values);
    const record: ModuleRecord = {
      path: absolute,
      exports: exportsObj,
      exportedTypes: types,
    };
    cache.set(absolute, record);
    return record;
  } finally {
    loading.delete(absolute);
  }
}

/**
 * Evaluate `koresha "path" nka alias`: load module and bind the export object.
 */
export function eval_import(
  pathStr: string,
  alias: string,
  env: Environment,
  span?: Span,
): RuntimeVal {
  const mod = loadModule(env, pathStr, span);
  // Bind namespace object as a constant in the importer.
  env.declareVar(alias, mod.exports, true);

  // Register exported type aliases under the bare export names only when the
  // importer does a namespace import — types stay accessed via values when
  // they are classes. Pure type aliases on the module are re-registered under
  // `alias` prefix is not valid in type syntax, so we register class types
  // that have a matching ClassVal export under the local alias... skipped.
  // Class exports work as values: rema alias.ClassName(...)
  // Also register types from the module that match export names into the
  // importer type env under the same names if not already present — allows
  // `reka x: Person` after importing a module that exported Person class.
  for (const [name, type] of mod.exportedTypes) {
    if (!env.lookupType(name)) {
      try {
        env.declareType(name, type);
      } catch {
        // already defined locally — leave existing
      }
    }
  }

  return mod.exports;
}
