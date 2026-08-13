/*************************************************************************************************************
 *                                              Path resolution                                              *
 *  Resolve script-relative paths for KIN_INYANDIKO and injiza(). Nested imports push the current file so    *
 *  relative paths resolve against the file being evaluated, not only the entry script.                      *
 *************************************************************************************************************/

import path from 'path';
import Environment from './environment';
import { StringVal } from './values';

/** Absolute paths of files currently being evaluated (entry script + injiza stack). */
const currentFileStack: string[] = [];

/**
 * Resolve a path relative to the file currently being evaluated.
 * Falls back to the `filename` binding (entry script / REPL cwd) when the stack is empty.
 * Absolute paths are returned as-is (normalized).
 */
export function resolveKinPath(env: Environment, relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) {
    return path.normalize(relativeOrAbsolute);
  }

  const baseFile =
    currentFileStack[currentFileStack.length - 1] ??
    resolveEntryFilename(env);

  return path.resolve(path.dirname(baseFile), relativeOrAbsolute);
}

/** Normalize the entry `filename` binding to an absolute path. */
export function resolveEntryFilename(env: Environment): string {
  const raw = (env.lookupVar('filename') as StringVal).value;
  if (path.isAbsolute(raw)) {
    return path.normalize(raw);
  }
  return path.resolve(process.cwd(), raw);
}

/**
 * Run `fn` with `absolutePath` as the current file for relative path resolution.
 * Used by `injiza` so nested imports and file I/O see the imported file's directory.
 */
export function withCurrentFile<T>(absolutePath: string, fn: () => T): T {
  currentFileStack.push(path.normalize(absolutePath));
  try {
    return fn();
  } finally {
    currentFileStack.pop();
  }
}
