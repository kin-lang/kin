import * as path from 'path';
import { PackageSource } from './types';

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceError';
  }
}

/**
 * Parse a dependency source string into a PackageSource.
 *
 * Supported forms:
 * - path:./relative  |  path:/absolute
 * - ./relative       |  ../relative  |  /absolute  (implicit path)
 * - git+https://...  |  git+ssh://...  |  git+file://...
 * - https://...git   |  http://...git  |  git@host:repo.git  (implicit git)
 * - any of the above with #ref for git
 */
export function parseSource(raw: string, projectRoot?: string): PackageSource {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new SourceError('Empty dependency source');
  }

  if (trimmed.startsWith('path:')) {
    const location = trimmed.slice('path:'.length);
    if (!location) {
      throw new SourceError(`Invalid path source: ${raw}`);
    }
    return {
      type: 'path',
      location: resolvePathLocation(location, projectRoot),
      raw: trimmed,
    };
  }

  if (trimmed.startsWith('git+')) {
    return parseGitSource(trimmed.slice('git+'.length), trimmed);
  }

  // Bare git-ish URLs
  if (
    /^(https?:\/\/|git@|ssh:\/\/|git:\/\/|file:\/\/)/.test(trimmed) ||
    trimmed.endsWith('.git') ||
    trimmed.includes('.git#')
  ) {
    return parseGitSource(trimmed, trimmed);
  }

  // Windows drive-letter paths are only valid on Windows.
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    if (process.platform !== 'win32') {
      throw new SourceError(
        `Windows drive path "${trimmed}" is not supported on this platform. Use a POSIX path under path: or a git URL.`,
      );
    }
    return {
      type: 'path',
      location: resolvePathLocation(trimmed, projectRoot),
      raw: trimmed,
    };
  }

  // Relative / absolute filesystem path
  if (trimmed.startsWith('.') || trimmed.startsWith('/')) {
    return {
      type: 'path',
      location: resolvePathLocation(trimmed, projectRoot),
      raw: trimmed,
    };
  }

  throw new SourceError(
    `Unrecognized dependency source "${raw}". Use path:./dir, a filesystem path, or a git URL (git+https://... or https://...git).`,
  );
}

function resolvePathLocation(location: string, projectRoot?: string): string {
  if (/^[A-Za-z]:[\\/]/.test(location) && process.platform !== 'win32') {
    throw new SourceError(
      `Windows drive path "${location}" is not supported on this platform.`,
    );
  }
  if (path.isAbsolute(location)) {
    return path.normalize(location);
  }
  const base = projectRoot ?? process.cwd();
  return path.normalize(path.resolve(base, location));
}

function parseGitSource(urlWithMaybeRef: string, raw: string): PackageSource {
  let location = urlWithMaybeRef;
  let ref: string | undefined;

  const hashIdx = urlWithMaybeRef.lastIndexOf('#');
  if (hashIdx > 0) {
    location = urlWithMaybeRef.slice(0, hashIdx);
    ref = urlWithMaybeRef.slice(hashIdx + 1) || undefined;
  }

  if (!location) {
    throw new SourceError(`Invalid git source: ${raw}`);
  }

  return {
    type: 'git',
    location,
    ref,
    raw,
  };
}

/** Format a path source relative to project root when possible. */
export function formatPathSource(
  absolutePath: string,
  projectRoot: string,
): string {
  const rel = path.relative(projectRoot, absolutePath);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    return `path:./${rel.split(path.sep).join('/')}`;
  }
  // Outside the project: absolute path: is stored (not portable across machines).
  return `path:${absolutePath}`;
}

/** Format a git source for the manifest. */
export function formatGitSource(url: string, ref?: string): string {
  const base = url.startsWith('git+') ? url : `git+${url}`;
  if (ref) {
    const without = base.replace(/#.*$/, '');
    return `${without}#${ref}`;
  }
  return base.replace(/#.*$/, '');
}
