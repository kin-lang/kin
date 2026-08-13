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
 * Absolute install path for a package under kin_modules/<name>.
 * Rejects invalid names and any path that would escape kin_modules.
 */
export function packageInstallPath(root: string, name: string): string {
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
    throw new PathError(`${label} must be relative to the project: ${relativePath}`);
  }
  const segments = relativePath.split(/[/\\]/);
  if (segments.some((s) => s === '..')) {
    throw new PathError(`${label} must not contain "..": ${relativePath}`);
  }
  const abs = path.resolve(root, relativePath);
  if (!isInsideDirectory(root, abs)) {
    throw new PathError(`${label} escapes project directory: ${relativePath}`);
  }
  const rel = path.relative(path.resolve(root), abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathError(`${label} escapes project directory: ${relativePath}`);
  }
  return rel.split(path.sep).join('/');
}
