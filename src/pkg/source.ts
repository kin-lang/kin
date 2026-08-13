import * as path from 'path';
import { PackageSource } from './types';

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceError';
  }
}

const ALLOWED_GIT_PREFIXES = [
  'https://',
  'http://',
  'ssh://',
  'git://',
  'file://',
  'git@',
];

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

  // Filesystem paths take precedence over the ".git" suffix heuristic so that
  // ./vendor/helpers.git and /abs/pkg.git install as path deps, not git clones.
  if (isFilesystemPathForm(trimmed)) {
    return {
      type: 'path',
      location: resolvePathLocation(trimmed, projectRoot),
      raw: trimmed,
    };
  }

  // URL-like git forms (scheme or git@ host syntax).
  if (looksLikeGitUrl(trimmed)) {
    return parseGitSource(trimmed, trimmed);
  }

  throw new SourceError(
    `Unrecognized dependency source "${raw}". Use path:./dir, a filesystem path, or a git URL (git+https://... or https://...git).`,
  );
}

function isFilesystemPathForm(value: string): boolean {
  if (value.startsWith('.') || value.startsWith('/')) return true;
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    if (process.platform !== 'win32') {
      throw new SourceError(
        `Windows drive path "${value}" is not supported on this platform. Use a POSIX path under path: or a git URL.`,
      );
    }
    return true;
  }
  return false;
}

function looksLikeGitUrl(value: string): boolean {
  const withoutRef = value.replace(/#.*$/, '');
  if (ALLOWED_GIT_PREFIXES.some((p) => withoutRef.startsWith(p))) {
    return true;
  }
  // Bare host/path ending in .git only when it does not look like a local path
  // (already handled above). Reject ambiguous registry-style names.
  if (
    withoutRef.endsWith('.git') &&
    (withoutRef.includes('://') || withoutRef.startsWith('git@'))
  ) {
    return true;
  }
  return false;
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

  validateGitLocation(location);
  if (ref !== undefined) {
    validateGitRef(ref);
  }

  return {
    type: 'git',
    location,
    ref,
    raw,
  };
}

/** Reject dashed args, ext::, and other non-URL git locations. */
export function validateGitLocation(location: string): void {
  if (!location || location.startsWith('-')) {
    throw new SourceError(
      `Invalid git location "${location}": must not be empty or start with "-"`,
    );
  }
  if (location.startsWith('ext::') || location.includes('ext::')) {
    throw new SourceError(
      `Git protocol "ext::" is not allowed. Use https, ssh, git, or file URLs.`,
    );
  }
  const allowed = ALLOWED_GIT_PREFIXES.some((p) => location.startsWith(p));
  if (!allowed) {
    throw new SourceError(
      `Unsupported git location "${location}". Allowed prefixes: ${ALLOWED_GIT_PREFIXES.join(', ')}`,
    );
  }
}

export function validateGitRef(ref: string): void {
  if (!ref || ref.startsWith('-')) {
    throw new SourceError(
      `Invalid git ref "${ref}": must not be empty or start with "-"`,
    );
  }
  // Conservative: reject shell metacharacters and path traversal in refs.
  if (/[\0\n\r]/.test(ref) || ref.includes('..')) {
    throw new SourceError(`Invalid git ref "${ref}"`);
  }
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
