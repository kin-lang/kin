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

// Host: DNS labels, IPv4, or bracketed IPv6. Must not start with '-'.
const HOST_RE =
  /^(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(?:\.(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?))*|localhost|\d{1,3}(?:\.\d{1,3}){3}|\[[0-9A-Fa-f:.]+\])$/;

// Ref: branch/tag/sha-like; no spaces, no leading dash, no path traversal.
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._/+\-]*$/;

/**
 * Parse a dependency source string into a PackageSource.
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

  // Filesystem paths take precedence over URL heuristics.
  if (isFilesystemPathForm(trimmed)) {
    return {
      type: 'path',
      location: resolvePathLocation(trimmed, projectRoot),
      raw: trimmed,
    };
  }

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

/** Reject dashed args, ext::, bad hosts, and other non-URL git locations. */
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

  if (location.startsWith('git@')) {
    // scp-like: git@host:path
    const rest = location.slice('git@'.length);
    const colon = rest.indexOf(':');
    if (colon <= 0) {
      throw new SourceError(
        `Invalid git@ location "${location}": expected git@host:path`,
      );
    }
    const host = rest.slice(0, colon);
    validateGitHost(host, location);
    const repoPath = rest.slice(colon + 1);
    if (!repoPath || repoPath.startsWith('-')) {
      throw new SourceError(`Invalid git@ path in "${location}"`);
    }
    return;
  }

  if (location.startsWith('file://')) {
    // file:// URLs have no remote host to inject; reject path forms starting with -
    const filePath = location.slice('file://'.length);
    // file:///abs or file://localhost/abs or file://host/path
    if (filePath.startsWith('-')) {
      throw new SourceError(`Invalid file:// location "${location}"`);
    }
    // If authority present as host before path: file://host/path
    if (!filePath.startsWith('/') && filePath.includes('/')) {
      const host = filePath.slice(0, filePath.indexOf('/'));
      if (host && host !== 'localhost') {
        validateGitHost(host, location);
      }
    }
    return;
  }

  // scheme://[userinfo@]host[:port][/path]
  const schemeMatch = location.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (!schemeMatch) {
    throw new SourceError(`Invalid git location "${location}"`);
  }
  const afterScheme = location.slice(schemeMatch[0].length);
  // Split authority and path
  const slash = afterScheme.indexOf('/');
  const authority = slash === -1 ? afterScheme : afterScheme.slice(0, slash);
  if (!authority) {
    throw new SourceError(
      `Invalid git location "${location}": missing host`,
    );
  }
  // userinfo@host:port
  let hostPort = authority;
  const at = authority.lastIndexOf('@');
  if (at !== -1) {
    const userinfo = authority.slice(0, at);
    if (!userinfo || userinfo.startsWith('-')) {
      throw new SourceError(`Invalid userinfo in git location "${location}"`);
    }
    hostPort = authority.slice(at + 1);
  }
  if (!hostPort || hostPort.startsWith('-')) {
    throw new SourceError(
      `Invalid host in git location "${location}": host must not be empty or start with "-"`,
    );
  }
  // Strip port
  let host = hostPort;
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end === -1) {
      throw new SourceError(`Invalid IPv6 host in "${location}"`);
    }
    host = hostPort.slice(0, end + 1);
  } else {
    const colon = hostPort.indexOf(':');
    if (colon !== -1) {
      host = hostPort.slice(0, colon);
      const port = hostPort.slice(colon + 1);
      if (port && !/^\d+$/.test(port)) {
        throw new SourceError(`Invalid port in git location "${location}"`);
      }
    }
  }
  validateGitHost(host, location);
}

function validateGitHost(host: string, location: string): void {
  if (!host || host.startsWith('-')) {
    throw new SourceError(
      `Invalid host "${host}" in git location "${location}"`,
    );
  }
  if (!HOST_RE.test(host)) {
    throw new SourceError(
      `Invalid host "${host}" in git location "${location}"`,
    );
  }
}

export function validateGitRef(ref: string): void {
  if (!ref || ref.startsWith('-')) {
    throw new SourceError(
      `Invalid git ref "${ref}": must not be empty or start with "-"`,
    );
  }
  if (ref.includes('..') || /[\0\n\r]/.test(ref)) {
    throw new SourceError(`Invalid git ref "${ref}"`);
  }
  if (!REF_RE.test(ref)) {
    throw new SourceError(
      `Invalid git ref "${ref}": use letters, digits, and . _ / + - only`,
    );
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
