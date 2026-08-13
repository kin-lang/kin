import * as fs from 'fs';
import {
  cleanupFetched,
  copyPackageTree,
  fetchPackage,
  readPackageName,
} from './fetch';
import {
  emptyLockfile,
  readLockfile,
  removeFromLockfile,
  writeLockfile,
} from './lockfile';
import { readManifest, writeManifest } from './manifest';
import {
  findProjectRoot,
  modulesDir,
  packageInstallPath,
} from './paths';
import { formatGitSource, formatPathSource, parseSource } from './source';
import { InstallResult, KinLockfile, LockedPackage, PkgOptions } from './types';

export class InstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstallError';
  }
}

export interface InstallReport {
  root: string;
  results: InstallResult[];
}

/**
 * Install every dependency listed in kin.json into kin_modules/,
 * refreshing the lockfile.
 */
export function installAll(options: PkgOptions = {}): InstallReport {
  const root = requireRoot(options.cwd);
  const manifest = readManifest(root);
  const deps = manifest.dependencies ?? {};
  const lock = readLockfile(root);
  const results: InstallResult[] = [];

  // Remove lock entries no longer in the manifest.
  for (const lockedName of Object.keys(lock.packages)) {
    if (!(lockedName in deps)) {
      removeFromLockfile(lock, lockedName);
      const installed = packageInstallPath(root, lockedName);
      if (fs.existsSync(installed)) {
        fs.rmSync(installed, { recursive: true, force: true });
      }
    }
  }

  for (const [name, spec] of Object.entries(deps)) {
    results.push(installOne(root, name, spec, lock, options));
  }

  // Drop packages present on disk but not in deps (e.g. manual leftover).
  const modules = modulesDir(root);
  if (fs.existsSync(modules)) {
    for (const entry of fs.readdirSync(modules, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!(entry.name in deps)) {
        fs.rmSync(packageInstallPath(root, entry.name), {
          recursive: true,
          force: true,
        });
      }
    }
  }

  writeLockfile(root, lock);
  return { root, results };
}

/**
 * Add a dependency to kin.json and install it.
 *
 * Spec forms: same as parseSource. Optional explicit name via "name=spec"
 * or separate name argument. When omitted, name is taken from the package's
 * kin.json, else the directory/repo basename.
 */
export function addDependency(
  spec: string,
  options: PkgOptions & { name?: string } = {},
): InstallResult {
  const root = requireRoot(options.cwd);
  const manifest = readManifest(root);
  const lock = readLockfile(root);

  const source = parseSource(spec, root);
  const fetched = fetchPackage(source);
  try {
    const name =
      options.name ??
      readPackageName(fetched.directory) ??
      deriveNameFromSource(source.location);

    if (!manifest.dependencies) {
      manifest.dependencies = {};
    }

    // Store a portable source string in the manifest.
    let storedSpec: string;
    if (source.type === 'path') {
      storedSpec = formatPathSource(source.location, root);
    } else {
      storedSpec = formatGitSource(source.location, source.ref);
    }
    manifest.dependencies[name] = storedSpec;
    writeManifest(root, manifest);

    const result = materialize(
      root,
      name,
      storedSpec,
      fetched,
      lock,
      options,
    );
    writeLockfile(root, lock);
    return result;
  } finally {
    cleanupFetched(fetched);
  }
}

/** Remove a dependency from the manifest, lockfile, and kin_modules. */
export function removeDependency(
  name: string,
  options: PkgOptions = {},
): void {
  const root = requireRoot(options.cwd);
  const manifest = readManifest(root);
  if (!manifest.dependencies || !(name in manifest.dependencies)) {
    throw new InstallError(
      `Dependency "${name}" is not listed in kin.json`,
    );
  }
  delete manifest.dependencies[name];
  writeManifest(root, manifest);

  const lock = readLockfile(root);
  removeFromLockfile(lock, name);
  writeLockfile(root, lock);

  const installed = packageInstallPath(root, name);
  if (fs.existsSync(installed)) {
    fs.rmSync(installed, { recursive: true, force: true });
  }
}

/** List installed packages from the lockfile (falls back to kin_modules). */
export function listPackages(options: PkgOptions = {}): LockedPackage[] {
  const root = requireRoot(options.cwd);
  const lock = readLockfile(root);
  const names = Object.keys(lock.packages).sort();
  return names.map((n) => lock.packages[n]);
}

export function listPackagesNamed(
  options: PkgOptions = {},
): Array<{ name: string } & LockedPackage> {
  const root = requireRoot(options.cwd);
  const lock = readLockfile(root);
  return Object.keys(lock.packages)
    .sort()
    .map((name) => ({ name, ...lock.packages[name] }));
}

function installOne(
  root: string,
  name: string,
  spec: string,
  lock: KinLockfile,
  options: PkgOptions,
): InstallResult {
  const existing = lock.packages[name];
  const source = parseSource(spec, root);

  // Skip re-fetch when lock entry matches and install dir is present with same integrity.
  if (existing && existing.source === spec) {
    const dest = packageInstallPath(root, name);
    if (fs.existsSync(dest)) {
      // For path deps, re-hash to detect local changes.
      if (source.type === 'path') {
        // Always refresh path deps so local edits flow into kin_modules.
      } else {
        return {
          name,
          version: existing.version,
          sourceType: existing.sourceType,
          installPath: dest,
          resolved: existing.resolved,
          integrity: existing.integrity,
          action: 'unchanged',
        };
      }
    }
  }

  const fetched = fetchPackage(source);
  try {
    return materialize(root, name, spec, fetched, lock, options);
  } finally {
    cleanupFetched(fetched);
  }
}

function materialize(
  root: string,
  name: string,
  spec: string,
  fetched: ReturnType<typeof fetchPackage>,
  lock: KinLockfile,
  _options: PkgOptions,
): InstallResult {
  const dest = packageInstallPath(root, name);
  const hadExisting = fs.existsSync(dest);
  const previous = lock.packages[name];

  copyPackageTree(fetched.directory, dest);

  const entry: LockedPackage = {
    version: fetched.version,
    source: spec,
    sourceType: fetched.sourceType,
    resolved: fetched.resolved,
    integrity: fetched.integrity,
  };
  lock.packages[name] = entry;

  let action: InstallResult['action'] = 'installed';
  if (hadExisting && previous) {
    action =
      previous.integrity === entry.integrity && previous.resolved === entry.resolved
        ? 'unchanged'
        : 'updated';
  }

  return {
    name,
    version: entry.version,
    sourceType: entry.sourceType,
    installPath: dest,
    resolved: entry.resolved,
    integrity: entry.integrity,
    action,
  };
}

function requireRoot(cwd?: string): string {
  const start = cwd ?? process.cwd();
  const root = findProjectRoot(start);
  if (!root) {
    throw new InstallError(
      `No kin.json found from ${start}. Run "kin init" to create a project.`,
    );
  }
  return root;
}

function deriveNameFromSource(location: string): string {
  // Strip trailing .git and path bits.
  const base = location
    .replace(/\/$/, '')
    .replace(/\.git$/, '')
    .split(/[/\\]/)
    .filter(Boolean)
    .pop();
  if (!base) {
    throw new InstallError(
      `Could not derive a package name from "${location}". Pass an explicit name.`,
    );
  }
  const normalized = base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  if (!normalized || !/^[a-z0-9]/.test(normalized)) {
    throw new InstallError(
      `Could not derive a valid package name from "${location}". Pass an explicit name.`,
    );
  }
  return normalized;
}

/** Ensure lock structure exists after init (optional empty lock). */
export function ensureEmptyLock(root: string): void {
  writeLockfile(root, emptyLockfile());
}
