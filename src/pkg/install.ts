import * as fs from 'fs';
import * as path from 'path';
import {
  cleanupFetched,
  copyPackageTree,
  fetchPackage,
  readPackageName,
} from './fetch';
import { hashDirectory } from './integrity';
import {
  readLockfile,
  removeFromLockfile,
  writeLockfile,
} from './lockfile';
import { readManifest, writeManifest } from './manifest';
import { isValidPackageName } from './names';
import {
  findProjectRoot,
  isInsideDirectory,
  modulesDir,
  packageInstallPath,
  PathError,
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
      safeRemoveInstalled(root, lockedName);
    }
  }

  for (const [name, spec] of Object.entries(deps)) {
    if (!isValidPackageName(name)) {
      throw new InstallError(
        `Invalid dependency name in kin.json: "${name}"`,
      );
    }
    results.push(installOne(root, name, spec, lock));
  }

  // Drop packages present on disk but not in deps (e.g. manual leftover).
  const modules = modulesDir(root);
  if (fs.existsSync(modules)) {
    for (const entry of fs.readdirSync(modules, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      // Only touch entries that look like package names; never rm arbitrary paths.
      if (!isValidPackageName(entry.name)) {
        continue;
      }
      if (!(entry.name in deps)) {
        safeRemoveInstalled(root, entry.name);
      }
    }
  }

  writeLockfile(root, lock);
  return { root, results };
}

/**
 * Add a dependency to kin.json and install it.
 *
 * Spec forms: same as parseSource. Optional explicit name via options.name.
 * When omitted, name is taken from the package's kin.json, else the
 * directory/repo basename.
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

    if (!isValidPackageName(name)) {
      throw new InstallError(
        `Invalid package name "${name}". Pass --name with a valid name.`,
      );
    }

    if (!manifest.dependencies) {
      manifest.dependencies = {};
    }

    // Store a portable source string in the manifest when possible.
    let storedSpec: string;
    if (source.type === 'path') {
      storedSpec = formatPathSource(source.location, root);
    } else {
      storedSpec = formatGitSource(source.location, source.ref);
    }
    manifest.dependencies[name] = storedSpec;
    writeManifest(root, manifest);

    const result = materialize(root, name, storedSpec, fetched, lock);
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
  if (!isValidPackageName(name)) {
    throw new InstallError(`Invalid package name "${name}"`);
  }
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

  safeRemoveInstalled(root, name);
}

/** List installed packages from the lockfile (name + lock entry). */
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
): InstallResult {
  const existing = lock.packages[name];
  const source = parseSource(spec, root);
  const dest = packageInstallPath(root, name);

  // Skip re-fetch when lock entry matches, install dir exists, and integrity holds.
  if (existing && existing.source === spec && fs.existsSync(dest)) {
    if (source.type === 'path') {
      // Always refresh path deps so local edits flow into kin_modules.
    } else {
      let currentIntegrity: string | null = null;
      try {
        currentIntegrity = hashDirectory(dest);
      } catch {
        currentIntegrity = null;
      }
      if (currentIntegrity !== null && currentIntegrity === existing.integrity) {
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
      // Integrity mismatch or unreadable tree → re-fetch below.
    }
  }

  const fetched = fetchPackage(source);
  try {
    return materialize(root, name, spec, fetched, lock);
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
): InstallResult {
  const dest = packageInstallPath(root, name);
  const hadExisting = fs.existsSync(dest);

  // Hash on-disk tree before replace so tamper/re-fetch reports "updated".
  let priorDiskIntegrity: string | null = null;
  if (hadExisting) {
    try {
      priorDiskIntegrity = hashDirectory(dest);
    } catch {
      priorDiskIntegrity = null;
    }
  }

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
  if (hadExisting) {
    action =
      priorDiskIntegrity !== null && priorDiskIntegrity === entry.integrity
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

/**
 * Remove an installed package directory only if it is safely inside kin_modules.
 */
function safeRemoveInstalled(root: string, name: string): void {
  if (!isValidPackageName(name)) {
    return;
  }
  let installed: string;
  try {
    installed = packageInstallPath(root, name);
  } catch (e) {
    if (e instanceof PathError) {
      throw new InstallError(e.message);
    }
    throw e;
  }
  const modules = pathResolveModules(root);
  if (!isInsideDirectory(modules, installed) || installed === modules) {
    throw new InstallError(
      `Refusing to remove path outside ${modules}: ${installed}`,
    );
  }
  if (fs.existsSync(installed)) {
    fs.rmSync(installed, { recursive: true, force: true });
  }
}

function pathResolveModules(root: string): string {
  return path.resolve(modulesDir(root));
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
  if (!isValidPackageName(normalized)) {
    throw new InstallError(
      `Could not derive a valid package name from "${location}". Pass an explicit name.`,
    );
  }
  return normalized;
}
