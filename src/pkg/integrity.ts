import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const SKIP_DIRS = new Set([
  '.git',
  'kin_modules',
  'node_modules',
  'dist',
  'coverage',
  '.herdr',
]);

export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

/**
 * Compute a stable sha256 integrity hash over package files.
 * Walks the tree in sorted order, hashing relative path + content.
 * Symlinks are refused (not followed) so installs cannot pull in external files.
 * The package root itself must be a real directory (not a symlink).
 */
export function hashDirectory(dir: string): string {
  let rootStat: fs.Stats;
  try {
    rootStat = fs.lstatSync(dir);
  } catch (e) {
    throw new IntegrityError(
      `Failed to stat package directory ${dir}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (rootStat.isSymbolicLink()) {
    throw new IntegrityError(
      `Package path is a symlink (not allowed): ${dir}`,
    );
  }
  if (!rootStat.isDirectory()) {
    throw new IntegrityError(`Package path is not a directory: ${dir}`);
  }

  const hash = crypto.createHash('sha256');
  const files = listFiles(dir).sort();
  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    const abs = path.join(dir, rel);
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) {
      throw new IntegrityError(
        `Package contains a symlink (not allowed): ${rel}`,
      );
    }
    if (!stat.isFile()) {
      throw new IntegrityError(
        `Package contains a non-file entry (not allowed): ${rel}`,
      );
    }
    hash.update(fs.readFileSync(abs));
    hash.update('\0');
  }
  return `sha256-${hash.digest('hex')}`;
}

function listFiles(root: string, prefix = ''): string[] {
  const abs = prefix ? path.join(root, prefix) : root;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch (e) {
    throw new IntegrityError(
      `Failed to read package directory ${abs}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const child = path.join(abs, entry.name);

    // Use lstat so we never follow symlinks into host files.
    let lstat: fs.Stats;
    try {
      lstat = fs.lstatSync(child);
    } catch (e) {
      throw new IntegrityError(
        `Failed to stat ${rel}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (lstat.isSymbolicLink()) {
      throw new IntegrityError(
        `Package contains a symlink (not allowed): ${rel}`,
      );
    }
    if (lstat.isDirectory()) {
      out.push(...listFiles(root, rel));
    } else if (lstat.isFile()) {
      out.push(rel.split(path.sep).join('/'));
    } else {
      throw new IntegrityError(
        `Package contains an unsupported file type: ${rel}`,
      );
    }
  }
  return out;
}
