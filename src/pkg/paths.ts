import * as fs from 'fs';
import * as path from 'path';
import { isValidPackageName } from './names';

export const MANIFEST_FILE = 'kin.json';
export const LOCKFILE_FILE = 'kin-lock.json';
export const MODULES_DIR = 'kin_modules';

export class PathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathError';
  }
}

/**
 * Walk upward from `start` looking for a directory that contains kin.json.
 * Returns null if none is found before the filesystem root.
 */
export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, MANIFEST_FILE))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

export function manifestPath(root: string): string {
  return path.join(root, MANIFEST_FILE);
}

export function lockfilePath(root: string): string {
  return path.join(root, LOCKFILE_FILE);
}

export function modulesDir(root: string): string {
  return path.join(root, MODULES_DIR);
}

/**
 * True when `child` is the same as `parent` or a path strictly inside it.
 * Uses path.relative (not string prefix) so `/foo` does not match `/foo-bar`.
 */
export function isInsideDirectory(parent: string, child: string): boolean {
  const parentResolved = path.resolve(parent);
  const childResolved = path.resolve(child);
  const rel = path.relative(parentResolved, childResolved);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Ensure kin_modules is a real directory under the project (not a symlink
 * that could redirect installs/removes outside the project tree).
 * Creates the directory if missing. Returns the real absolute path.
 */
export function ensureModulesDir(root: string): string {
  const modules = path.resolve(modulesDir(root));
  const rootReal = safeRealpath(root);

  if (fs.existsSync(modules)) {
    let lstat: fs.Stats;
    try {
      lstat = fs.lstatSync(modules);
    } catch (e) {
      throw new PathError(
        `Cannot stat ${MODULES_DIR}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (lstat.isSymbolicLink()) {
      throw new PathError(
        `${MODULES_DIR} must be a real directory under the project, not a symlink`,
      );
    }
    if (!lstat.isDirectory()) {
      throw new PathError(`${MODULES_DIR} exists but is not a directory`);
    }
  } else {
    fs.mkdirSync(modules, { recursive: true });
  }

  const modulesReal = safeRealpath(modules);
  if (!isInsideDirectory(rootReal, modulesReal)) {
    throw new PathError(
      `${MODULES_DIR} resolves outside the project root (refusing to use it)`,
    );
  }
  return modulesReal;
}

function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch (e) {
    throw new PathError(
      `Cannot resolve real path for ${p}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * Absolute install path for a package under kin_modules/<name>.
 * Rejects invalid names and any path that would escape kin_modules.
 * Ensures kin_modules is not a symlink out of the project.
 */
export function packageInstallPath(root: string, name: string): string {
  if (!isValidPackageName(name)) {
    throw new PathError(
      `Invalid package name "${name}". Names must be lowercase letters, digits, hyphens, or underscores (no path segments).`,
    );
  }
  const modulesReal = ensureModulesDir(root);
  // Join against the lexical modules path under root, then realpath-check.
  const destLexical = path.resolve(modulesDir(root), name);
  if (!isInsideDirectory(path.resolve(modulesDir(root)), destLexical)) {
    throw new PathError(
      `Package install path escapes ${MODULES_DIR}/: "${name}"`,
    );
  }
  // Dest may not exist yet; validate parent is modulesReal and name is single segment.
  const destRealParent = modulesReal;
  const dest = path.join(destRealParent, name);
  if (!isInsideDirectory(modulesReal, dest) || dest === modulesReal) {
    throw new PathError(
      `Package install path escapes ${MODULES_DIR}/: "${name}"`,
    );
  }
  return dest;
}

/**
 * Resolve the on-disk location of an installed package by name.
 * Returns null if the name is invalid, the project is missing, or the package
 * is not present under kin_modules.
 */
export function resolveInstalledPackage(
  name: string,
  start: string = process.cwd(),
): string | null {
  if (!isValidPackageName(name)) {
    return null;
  }
  const root = findProjectRoot(start);
  if (!root) {
    return null;
  }
  let dest: string;
  try {
    dest = packageInstallPath(root, name);
  } catch {
    return null;
  }
  if (!fs.existsSync(dest)) {
    return null;
  }
  return dest;
}

/**
 * Ensure a project-relative path (e.g. main entry) stays inside `root`.
 * Returns the normalized relative path using `/` separators for the manifest.
 */
export function containProjectRelativePath(
  root: string,
  relativePath: string,
  label = 'path',
): string {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new PathError(`${label} must be a non-empty relative path`);
  }
  if (path.isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new PathError(
      `${label} must be relative to the project: ${relativePath}`,
    );
  }
  const segments = relativePath.split(/[/\\]/);
  if (segments.some((s) => s === '..')) {
    throw new PathError(`${label} must not contain "..": ${relativePath}`);
  }
  if (segments.some((s) => s === '' || s === '.')) {
    // Allow "src/main.kin" but reject empty segments from leading/trailing slash-only weirdness
    // except we allow nested paths; filter only empty segments from double slashes
  }
  const cleaned = segments.filter((s) => s !== '' && s !== '.');
  if (cleaned.length === 0) {
    throw new PathError(`${label} must be a non-empty relative path`);
  }
  if (cleaned.some((s) => s === '..')) {
    throw new PathError(`${label} must not contain "..": ${relativePath}`);
  }
  const abs = path.resolve(root, cleaned.join(path.sep));
  if (!isInsideDirectory(root, abs)) {
    throw new PathError(`${label} escapes project directory: ${relativePath}`);
  }
  const rel = path.relative(path.resolve(root), abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathError(`${label} escapes project directory: ${relativePath}`);
  }
  return rel.split(path.sep).join('/');
}

/**
 * Write JSON atomically (temp file in same dir + rename).
 */
export function writeJsonAtomic(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore cleanup errors
    }
    throw e;
  }
}
