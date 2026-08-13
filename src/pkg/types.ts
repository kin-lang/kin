/**
 * Kin package manager types (first slice).
 *
 * Manifest: kin.json
 * Lockfile: kin-lock.json
 * Install dir: kin_modules/
 */

/** Source kind for a dependency. */
export type PackageSourceType = 'path' | 'git';

/**
 * A parsed dependency source.
 * Spec strings look like:
 * - path:./vendor/foo  or  ./vendor/foo
 * - git+https://github.com/org/pkg.git#main
 * - https://github.com/org/pkg.git#v1.0.0
 */
export interface PackageSource {
  type: PackageSourceType;
  /** For path: absolute or project-relative path. For git: clone URL. */
  location: string;
  /** Optional git ref (branch, tag, or commit). */
  ref?: string;
  /** Original dependency string from the manifest. */
  raw: string;
}

/** Project / package manifest stored as kin.json. */
export interface KinManifest {
  name: string;
  version: string;
  description?: string;
  /** Entry file relative to the package root. Defaults to main.kin. */
  main?: string;
  /** Map of dependency name -> source spec string. */
  dependencies?: Record<string, string>;
  /** Optional Kin language/runtime range (reserved for later). */
  kin?: string;
  /** Arbitrary extra fields are preserved on round-trip. */
  [key: string]: unknown;
}

/** One locked package entry. */
export interface LockedPackage {
  version: string;
  /** Original source spec from the manifest. */
  source: string;
  sourceType: PackageSourceType;
  /**
   * Fully resolved identifier:
   * - path: absolute path at install time
   * - git: <url>#<commitSha>
   */
  resolved: string;
  /** sha256 hex of package contents (or of resolved commit for git). */
  integrity: string;
}

/** Lockfile stored as kin-lock.json. */
export interface KinLockfile {
  lockfileVersion: 1;
  packages: Record<string, LockedPackage>;
}

/** Result of installing a single package. */
export interface InstallResult {
  name: string;
  version: string;
  sourceType: PackageSourceType;
  /** Absolute path on disk under kin_modules. */
  installPath: string;
  resolved: string;
  integrity: string;
  /** Whether the package was newly installed or already matched the lock. */
  action: 'installed' | 'updated' | 'unchanged';
}

/** Options shared by package manager operations. */
export interface PkgOptions {
  /** Project root (directory containing kin.json). Defaults to cwd search. */
  cwd?: string;
  /** Suppress non-error console output. */
  quiet?: boolean;
}
