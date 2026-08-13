import * as fs from 'fs';
import { KinLockfile, LockedPackage } from './types';
import { lockfilePath, writeJsonAtomic } from './paths';
import { isValidPackageName } from './names';

export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockfileError';
  }
}

export function emptyLockfile(): KinLockfile {
  return { lockfileVersion: 1, packages: {} };
}

export function readLockfile(root: string): KinLockfile {
  const file = lockfilePath(root);
  if (!fs.existsSync(file)) {
    return emptyLockfile();
  }
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (e) {
    throw new LockfileError(
      `Failed to read ${file}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new LockfileError(
      `Invalid JSON in ${file}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return validateLockfile(parsed, file);
}

export function writeLockfile(root: string, lock: KinLockfile): void {
  const validated = validateLockfile(lock, lockfilePath(root));
  // Stable key order for nicer diffs.
  const ordered: KinLockfile = {
    lockfileVersion: 1,
    packages: {},
  };
  for (const key of Object.keys(validated.packages).sort()) {
    ordered.packages[key] = validated.packages[key];
  }
  writeJsonAtomic(lockfilePath(root), ordered);
}

export function validateLockfile(
  raw: unknown,
  fileHint = 'kin-lock.json',
): KinLockfile {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new LockfileError(`${fileHint}: expected a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  if (obj.lockfileVersion !== 1) {
    throw new LockfileError(
      `${fileHint}: unsupported lockfileVersion (expected 1)`,
    );
  }
  if (
    obj.packages === null ||
    typeof obj.packages !== 'object' ||
    Array.isArray(obj.packages)
  ) {
    throw new LockfileError(`${fileHint}: "packages" must be an object`);
  }
  const packages: Record<string, LockedPackage> = {};
  for (const [name, entry] of Object.entries(
    obj.packages as Record<string, unknown>,
  )) {
    if (!isValidPackageName(name)) {
      throw new LockfileError(
        `${fileHint}: invalid package name "${name}" (must be a simple package name, not a path)`,
      );
    }
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new LockfileError(
        `${fileHint}: package "${name}" must be an object`,
      );
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.version !== 'string') {
      throw new LockfileError(
        `${fileHint}: package "${name}" missing version`,
      );
    }
    if (typeof e.source !== 'string') {
      throw new LockfileError(`${fileHint}: package "${name}" missing source`);
    }
    if (e.sourceType !== 'path' && e.sourceType !== 'git') {
      throw new LockfileError(
        `${fileHint}: package "${name}" has invalid sourceType`,
      );
    }
    if (typeof e.resolved !== 'string') {
      throw new LockfileError(
        `${fileHint}: package "${name}" missing resolved`,
      );
    }
    if (typeof e.integrity !== 'string') {
      throw new LockfileError(
        `${fileHint}: package "${name}" missing integrity`,
      );
    }
    packages[name] = {
      version: e.version,
      source: e.source,
      sourceType: e.sourceType,
      resolved: e.resolved,
      integrity: e.integrity,
    };
  }
  return { lockfileVersion: 1, packages };
}

/** Drop a package from the lockfile (mutates and returns it). */
export function removeFromLockfile(
  lock: KinLockfile,
  name: string,
): KinLockfile {
  delete lock.packages[name];
  return lock;
}
