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
 * Inspect kin_modules without creating it.
 * Returns null if missing. Throws if present but unsafe (symlink/file/outside).
 */
export function inspectModulesDir(root: string): string | null {
  const modules = path.resolve(modulesDir(root));
  if (!fs.existsSync(modules)) {
    return null;
  }
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
  const rootReal = safeRealpath(root);
  const modulesReal = safeRealpath(modules);
  if (!isInsideDirectory(rootReal, modulesReal)) {
    throw new PathError(
      `${MODULES_DIR} resolves outside the project root (refusing to use it)`,
    );
  }
  return modulesReal;
}

/**
 * Ensure kin_modules is a real directory under the project (not a symlink
 * that could redirect installs/removes outside the project tree).
 * Creates the directory if missing. Returns the real absolute path.
 */
export function ensureModulesDir(root: string): string {
  const existing = inspectModulesDir(root);
  if (existing) {
    return existing;
  }
  const modules = path.resolve(modulesDir(root));
  fs.mkdirSync(modules, { recursive: true });
  // Re-inspect after create to catch races / unexpected types.
  const created = inspectModulesDir(root);
  if (!created) {
    throw new PathError(`Failed to create ${MODULES_DIR}`);
  }
  return created;
}

/**
 * Lexical install path for a package under kin_modules/<name>.
 * Does not create directories. Throws on invalid names.
 */
export function packageInstallPathLexical(root: string, name: string): string {
  if (!isValidPackageName(name)) {
    throw new PathError(
      `Invalid package name "${name}". Names must be lowercase letters, digits, hyphens, or underscores (no path segments).`,
    );
  }
  const modules = path.resolve(modulesDir(root));
  const dest = path.resolve(modules, name);
  if (!isInsideDirectory(modules, dest) || dest === modules) {
    throw new PathError(
      `Package install path escapes ${MODULES_DIR}/: "${name}"`,
    );
  }
  return dest;
}

/**
 * Absolute install path for a package under kin_modules/<name>.
 * Ensures modules dir exists and is safe. Returns path under the real modules dir.
 */
export function packageInstallPath(root: string, name: string): string {
  const modulesReal = ensureModulesDir(root);
  // Validate name via lexical helper.
  packageInstallPathLexical(root, name);
  const dest = path.join(modulesReal, name);
  if (!isInsideDirectory(modulesReal, dest) || dest === modulesReal) {
    throw new PathError(
      `Package install path escapes ${MODULES_DIR}/: "${name}"`,
    );
  }
  return dest;
}

/**
 * Re-verify that kin_modules is still a real directory at the expected realpath,
 * and that dest is still contained. Call immediately before/after install IO.
 */
export function assertSafeInstallTarget(
  root: string,
  name: string,
  expectedModulesReal: string,
  dest: string,
): void {
  const currentModules = inspectModulesDir(root);
  if (!currentModules) {
    throw new PathError(`${MODULES_DIR} disappeared during install`);
  }
  if (currentModules !== expectedModulesReal) {
    throw new PathError(
      `${MODULES_DIR} changed during install (possible symlink swap); refusing to continue`,
    );
  }
  packageInstallPathLexical(root, name);
  if (!isInsideDirectory(currentModules, dest) || dest === currentModules) {
    throw new PathError(
      `Package install path escapes ${MODULES_DIR}/: "${name}"`,
    );
  }
  // If dest already exists, its realpath must stay inside modules.
  if (fs.existsSync(dest)) {
    let lstat: fs.Stats;
    try {
      lstat = fs.lstatSync(dest);
    } catch (e) {
      throw new PathError(
        `Cannot stat install target: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (lstat.isSymbolicLink()) {
      // Lexical path is under modules; caller may replace/unlink the link.
      return;
    }
    try {
      const realDest = fs.realpathSync(dest);
      if (
        !isInsideDirectory(currentModules, realDest) ||
        realDest === currentModules
      ) {
        throw new PathError(
          `Install target resolves outside ${MODULES_DIR}/: "${name}"`,
        );
      }
    } catch (e) {
      if (e instanceof PathError) throw e;
      throw new PathError(
        `Cannot resolve install target: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

/**
 * Resolve the on-disk location of an installed package by name.
 * Returns null if the name is invalid, the project is missing, or the package
 * is not present under kin_modules. Does not create kin_modules.
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
  let modulesReal: string | null;
  try {
    modulesReal = inspectModulesDir(root);
  } catch {
    return null;
  }
  if (!modulesReal) {
    return null;
  }
  let dest: string;
  try {
    dest = path.join(modulesReal, name);
    packageInstallPathLexical(root, name);
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
