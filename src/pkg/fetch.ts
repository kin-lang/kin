import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PackageSource } from './types';
import { hashDirectory } from './integrity';

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
  if (!fs.statSync(dir).isDirectory()) {
    throw new FetchError(`Path dependency is not a directory: ${dir}`);
  }
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
}

function fetchGit(source: PackageSource): FetchedPackage {
  assertGitAvailable();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-pkg-'));
  try {
    // Shallow clone; if a specific ref is given, try it as branch/tag first.
    const cloneArgs = ['clone', '--depth', '1'];
    if (source.ref) {
      cloneArgs.push('--branch', source.ref);
    }
    cloneArgs.push(source.location, tmp);

    try {
      execFileSync('git', cloneArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
    } catch (first) {
      // Branch may be a full commit SHA (shallow branch clone fails). Full clone + checkout.
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp, { recursive: true });
      try {
        execFileSync('git', ['clone', source.location, tmp], {
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf-8',
        });
        if (source.ref) {
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
    fs.rmSync(tmp, { recursive: true, force: true });
    throw new FetchError(
      `Failed to fetch git package: ${e instanceof Error ? e.message : String(e)}`,
    );
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
 * Skips nested dependency and VCS directories.
 */
export function copyPackageTree(src: string, dest: string): void {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  copyRecursive(src, dest);
}

function copyRecursive(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP_COPY.has(entry.name)) continue;
      copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}

export function cleanupFetched(fetched: FetchedPackage): void {
  if (fetched.isTemp && fs.existsSync(fetched.directory)) {
    fs.rmSync(fetched.directory, { recursive: true, force: true });
  }
}
