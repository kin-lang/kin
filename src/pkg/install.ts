import * as fs from 'fs';
import * as path from 'path';
import {
  cleanupFetched,
  fetchPackage,
  installPackageTree,
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
  ensureModulesDir,
  findProjectRoot,
  inspectModulesDir,
  isInsideDirectory,
  modulesDir,
  packageInstallPath,
  packageInstallPathLexical,
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
 * Materializes first so a failed install does not leave a dangling dep entry.
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

    let storedSpec: string;
    if (source.type === 'path') {
      storedSpec = formatPathSource(source.location, root);
    } else {
      storedSpec = formatGitSource(source.location, source.ref);
    }

    const result = materialize(root, name, storedSpec, fetched, lock);

    if (!manifest.dependencies) {
      manifest.dependencies = {};
    }
    manifest.dependencies[name] = storedSpec;
    writeManifest(root, manifest);
    writeLockfile(root, lock);
    return result;
  } finally {
    cleanupFetched(fetched);
  }
}

/**
 * Remove a dependency from disk first, then manifest and lockfile.
 */
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

  // Disk first so a failed remove does not desync manifest from modules.
  safeRemoveInstalled(root, name);

  delete manifest.dependencies[name];
  writeManifest(root, manifest);

  const lock = readLockfile(root);
  removeFromLockfile(lock, name);
  writeLockfile(root, lock);
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

  if (existing && existing.source === spec && fs.existsSync(dest)) {
    if (source.type === 'path') {
      // Always refresh path deps.
    } else {
      // Refuse package-root symlinks (hashDirectory also rejects them).
      let isRealDir = false;
      try {
        const st = fs.lstatSync(dest);
        isRealDir = st.isDirectory() && !st.isSymbolicLink();
      } catch {
        isRealDir = false;
      }
      let currentIntegrity: string | null = null;
      if (isRealDir) {
        try {
          currentIntegrity = hashDirectory(dest);
        } catch {
          currentIntegrity = null;
        }
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
  const modulesReal = ensureModulesDir(root);
  const dest = packageInstallPath(root, name);
  const hadExisting = fs.existsSync(dest);

  let priorDiskIntegrity: string | null = null;
  if (hadExisting) {
    try {
      priorDiskIntegrity = hashDirectory(dest);
    } catch {
      priorDiskIntegrity = null;
    }
  }

  // Stage outside the project, then promote only if kin_modules is still the
  // same real directory. Avoids writing through a swapped modules symlink.
  try {
    installPackageTree(fetched.directory, dest, modulesReal, () => {
      const current = inspectModulesDir(root);
      if (!current) {
        throw new PathError('kin_modules disappeared during install');
      }
      return current;
    });
  } catch (e) {
    throw new InstallError(
      e instanceof Error ? e.message : String(e),
    );
  }

  // Confirm final dest is a real directory inside modulesReal.
  try {
    const st = fs.lstatSync(dest);
    if (st.isSymbolicLink() || !st.isDirectory()) {
      throw new InstallError(
        `Install of "${name}" did not produce a real directory`,
      );
    }
    const realDest = fs.realpathSync(dest);
    if (
      !isInsideDirectory(modulesReal, realDest) ||
      realDest === modulesReal
    ) {
      try {
        fs.rmSync(dest, { recursive: true, force: true });
      } catch {
        // ignore
      }
      throw new InstallError(
        `Install of "${name}" resolved outside ${modulesReal}; refused`,
      );
    }
  } catch (e) {
    if (e instanceof InstallError) throw e;
    throw new InstallError(
      `Failed to verify install path for "${name}": ${e instanceof Error ? e.message : String(e)}`,
    );
  }

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
 * Remove an installed package directory or symlink only if its lexical path
 * is under kin_modules/<name>. Symlinks are unlinked without following.
 */
function safeRemoveInstalled(root: string, name: string): void {
  if (!isValidPackageName(name)) {
    return;
  }
  let lexical: string;
  let modulesReal: string | null;
  try {
    lexical = packageInstallPathLexical(root, name);
    modulesReal = inspectModulesDir(root);
  } catch (e) {
    if (e instanceof PathError) {
      throw new InstallError(e.message);
    }
    throw e;
  }
  if (!modulesReal) {
    // Nothing to remove; do not create kin_modules as a side effect.
    return;
  }

  // Prefer the path under the real modules dir.
  const installed = path.join(modulesReal, name);
  if (!isInsideDirectory(modulesReal, installed) || installed === modulesReal) {
    throw new InstallError(
      `Refusing to remove path outside ${modulesReal}: ${installed}`,
    );
  }

  const candidate = fs.existsSync(installed)
    ? installed
    : fs.existsSync(lexical)
      ? lexical
      : installed;

  if (!fs.existsSync(candidate)) {
    return;
  }

  let lstat: fs.Stats;
  try {
    lstat = fs.lstatSync(candidate);
  } catch (e) {
    throw new InstallError(
      `Cannot stat package "${name}": ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (lstat.isSymbolicLink()) {
    // Unlink the link node itself (do not follow into victim).
    fs.unlinkSync(candidate);
    return;
  }

  if (lstat.isDirectory() || lstat.isFile()) {
    try {
      const realInstalled = fs.realpathSync(candidate);
      if (
        !isInsideDirectory(modulesReal, realInstalled) ||
        realInstalled === modulesReal
      ) {
        throw new InstallError(
          `Refusing to remove path outside ${modulesReal}: ${realInstalled}`,
        );
      }
      fs.rmSync(realInstalled, { recursive: true, force: true });
    } catch (e) {
      if (e instanceof InstallError) throw e;
      throw new InstallError(
        `Failed to remove package "${name}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    return;
  }

  throw new InstallError(
    `Refusing to remove unsupported entry for package "${name}"`,
  );
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
