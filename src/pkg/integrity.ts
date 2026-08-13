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

/**
 * Compute a stable sha256 integrity hash over package files.
 * Walks the tree in sorted order, hashing relative path + content.
 */
export function hashDirectory(dir: string): string {
  const hash = crypto.createHash('sha256');
  const files = listFiles(dir).sort();
  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(dir, rel)));
    hash.update('\0');
  }
  return `sha256-${hash.digest('hex')}`;
}

export function hashString(value: string): string {
  const digest = crypto.createHash('sha256').update(value).digest('hex');
  return `sha256-${digest}`;
}

function listFiles(root: string, prefix = ''): string[] {
  const abs = path.join(root, prefix);
  if (!fs.existsSync(abs)) {
    return [];
  }
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFiles(root, rel));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      out.push(rel.split(path.sep).join('/'));
    }
  }
  return out;
}
