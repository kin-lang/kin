/**
 * Kin package manager (first slice).
 *
 * Provides project init, path/git dependency install, lockfile, and
 * kin_modules layout. Language-level imports are intentionally out of scope
 * for this slice — packages are materialized on disk for tooling and a future
 * module system.
 */

export * from './types';
export {
  MANIFEST_FILE,
  LOCKFILE_FILE,
  MODULES_DIR,
  findProjectRoot,
  resolveInstalledPackage,
  manifestPath,
  lockfilePath,
  modulesDir,
  packageInstallPath,
  packageInstallPathLexical,
  ensureModulesDir,
  inspectModulesDir,
  assertSafeInstallTarget,
  isInsideDirectory,
  containProjectRelativePath,
  PathError,
} from './paths';
export { isValidPackageName } from './names';
export {
  ManifestError,
  validateManifest,
  readManifest,
  writeManifest,
  defaultManifest,
} from './manifest';
export {
  LockfileError,
  emptyLockfile,
  readLockfile,
  writeLockfile,
  validateLockfile,
} from './lockfile';
export {
  SourceError,
  parseSource,
  formatPathSource,
  formatGitSource,
  validateGitLocation,
  validateGitRef,
} from './source';
export { hashDirectory, IntegrityError } from './integrity';
export {
  FetchError,
  fetchPackage,
  readPackageName,
  readPackageVersion,
  copyPackageTree,
  installPackageTree,
} from './fetch';
export {
  InstallError,
  installAll,
  addDependency,
  removeDependency,
  listPackagesNamed,
} from './install';
export type { InstallReport } from './install';
export { InitError, initProject } from './init';
export type { InitOptions, InitResult } from './init';
