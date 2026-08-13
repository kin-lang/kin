import * as fs from 'fs';
import * as path from 'path';

export const MANIFEST_FILE = 'kin.json';
export const LOCKFILE_FILE = 'kin-lock.json';
export const MODULES_DIR = 'kin_modules';

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

export function packageInstallPath(root: string, name: string): string {
  return path.join(modulesDir(root), name);
}

/**
 * Resolve the on-disk location of an installed package by name.
 * Returns null if the package is not present under kin_modules.
 */
export function resolveInstalledPackage(
  name: string,
  start: string = process.cwd(),
): string | null {
  const root = findProjectRoot(start);
  if (!root) {
    return null;
  }
  const dest = packageInstallPath(root, name);
  if (!fs.existsSync(dest)) {
    return null;
  }
  return dest;
}
