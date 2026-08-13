import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PackageSource } from './types';
import { hashDirectory, IntegrityError } from './integrity';

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export interface FetchedPackage {
  /** Staging directory containing package files. Caller owns cleanup if temp. */
  directory: string;
  /** Whether `directory` is a temp dir that should be removed after install. */
  isTemp: boolean;
  version: string;
  resolved: string;
  integrity: string;
  sourceType: 'path' | 'git';
}

const SKIP_COPY = new Set([
  '.git',
  'kin_modules',
  'node_modules',
  'dist',
  'coverage',
]);

/**
 * Materialize a package source into a local directory ready to copy into
 * kin_modules. For path sources this is the source tree itself; for git it
 * is a shallow clone checked out at the requested ref.
 */
export function fetchPackage(source: PackageSource): FetchedPackage {
  if (source.type === 'path') {
    return fetchPath(source);
  }
  return fetchGit(source);
}

function fetchPath(source: PackageSource): FetchedPackage {
  const dir = source.location;
  if (!fs.existsSync(dir)) {
    throw new FetchError(`Path dependency not found: ${dir}`);
  }
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(dir);
  } catch (e) {
    throw new FetchError(
      `Path dependency not readable: ${dir}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (stat.isSymbolicLink()) {
    throw new FetchError(
      `Path dependency must be a real directory, not a symlink: ${dir}`,
    );
  }
  if (!stat.isDirectory()) {
    throw new FetchError(`Path dependency is not a directory: ${dir}`);
  }
  try {
    const version = readPackageVersion(dir);
    const integrity = hashDirectory(dir);
    return {
      directory: dir,
      isTemp: false,
      version,
      resolved: dir,
      integrity,
      sourceType: 'path',
    };
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError(
      `Failed to read path package at ${dir}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function fetchGit(source: PackageSource): FetchedPackage {
  assertGitAvailable();
  // Defense in depth: location/ref already validated in parseSource.
  if (source.location.startsWith('-') || source.ref?.startsWith('-')) {
    throw new FetchError('Invalid git location or ref');
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-pkg-'));
  try {
    // Shallow clone; if a specific ref is given, try it as branch/tag first.
    // Use `--` so location cannot be interpreted as a git option.
    const cloneArgs = ['clone', '--depth', '1'];
    if (source.ref) {
      cloneArgs.push('--branch', source.ref);
    }
    cloneArgs.push('--', source.location, tmp);

    try {
      execFileSync('git', cloneArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
    } catch {
      // Branch may be a full commit SHA (shallow branch clone fails). Full clone + checkout.
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp, { recursive: true });
      try {
        execFileSync('git', ['clone', '--', source.location, tmp], {
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf-8',
        });
        if (source.ref) {
          // Do not use `checkout -- <ref>` — git treats args after `--` as pathspecs.
          // Ref is validated to not start with `-` in parseSource.
          execFileSync('git', ['checkout', source.ref], {
            cwd: tmp,
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf-8',
          });
        }
      } catch (second) {
        fs.rmSync(tmp, { recursive: true, force: true });
        const msg =
          second instanceof Error ? second.message : String(second);
        throw new FetchError(
          `Failed to clone ${source.location}${source.ref ? `#${source.ref}` : ''}: ${msg}`,
        );
      }
    }

    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: tmp,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    // Drop .git so installed packages are plain trees (and hash is stable).
    fs.rmSync(path.join(tmp, '.git'), { recursive: true, force: true });

    const version = readPackageVersion(tmp);
    const integrity = hashDirectory(tmp);
    return {
      directory: tmp,
      isTemp: true,
      version,
      resolved: `${source.location}#${commit}`,
      integrity,
      sourceType: 'git',
    };
  } catch (e) {
    if (e instanceof FetchError) throw e;
    if (fs.existsSync(tmp)) {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    const msg =
      e instanceof IntegrityError || e instanceof Error
        ? e.message
        : String(e);
    throw new FetchError(`Failed to fetch git package: ${msg}`);
  }
}

function assertGitAvailable(): void {
  try {
    execFileSync('git', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new FetchError(
      'git is required to install git dependencies, but was not found on PATH',
    );
  }
}

/** Read version from kin.json if present; otherwise "0.0.0". */
export function readPackageVersion(dir: string): string {
  const file = path.join(dir, 'kin.json');
  if (!fs.existsSync(file)) {
    return '0.0.0';
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
      version?: unknown;
    };
    if (typeof parsed.version === 'string' && parsed.version.trim()) {
      return parsed.version;
    }
  } catch {
    // ignore malformed package manifests for version purposes
  }
  return '0.0.0';
}

/** Read package name from kin.json if present. */
export function readPackageName(dir: string): string | null {
  const file = path.join(dir, 'kin.json');
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
      name?: unknown;
    };
    if (typeof parsed.name === 'string' && parsed.name.trim()) {
      return parsed.name.trim();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Copy package files from src into dest, replacing dest if it exists.
 * Skips nested dependency and VCS directories. Refuses symlinks.
 */
export function copyPackageTree(src: string, dest: string): void {
  try {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    copyRecursive(src, dest);
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError(
      `Failed to copy package into ${dest}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function copyRecursive(src: string, dest: string): void {
  let lstat: fs.Stats;
  try {
    lstat = fs.lstatSync(src);
  } catch (e) {
    throw new FetchError(
      `Failed to read package entry ${src}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (lstat.isSymbolicLink()) {
    throw new FetchError(
      `Refusing to install package: symlink not allowed (${src})`,
    );
  }

  if (lstat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP_COPY.has(entry.name)) continue;
      copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
    return;
  }

  if (!lstat.isFile()) {
    throw new FetchError(
      `Refusing to install package: unsupported file type at ${src}`,
    );
  }

  fs.copyFileSync(src, dest);
}

export function cleanupFetched(fetched: FetchedPackage): void {
  if (fetched.isTemp && fs.existsSync(fetched.directory)) {
    fs.rmSync(fetched.directory, { recursive: true, force: true });
  }
}
