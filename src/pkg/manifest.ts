import * as fs from 'fs';
import * as path from 'path';
import { KinManifest } from './types';
import { manifestPath } from './paths';
import { isValidPackageName } from './names';

export { isValidPackageName } from './names';

const SEMVER_LIKE = /^\d+\.\d+\.\d+([-+].*)?$/;

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

/** Validate a parsed object as a KinManifest. Throws ManifestError on failure. */
export function validateManifest(
  raw: unknown,
  fileHint = 'kin.json',
): KinManifest {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ManifestError(`${fileHint}: expected a JSON object`);
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    throw new ManifestError(`${fileHint}: "name" must be a non-empty string`);
  }
  if (!isValidPackageName(obj.name)) {
    throw new ManifestError(
      `${fileHint}: "name" must be a valid package name (lowercase letters, digits, hyphens, underscores; no path separators)`,
    );
  }
  if (typeof obj.version !== 'string' || obj.version.trim() === '') {
    throw new ManifestError(
      `${fileHint}: "version" must be a non-empty string`,
    );
  }
  if (!SEMVER_LIKE.test(obj.version)) {
    throw new ManifestError(
      `${fileHint}: "version" must look like semver (e.g. 0.1.0)`,
    );
  }
  if (
    obj.description !== undefined &&
    typeof obj.description !== 'string'
  ) {
    throw new ManifestError(`${fileHint}: "description" must be a string`);
  }
  if (obj.main !== undefined && typeof obj.main !== 'string') {
    throw new ManifestError(`${fileHint}: "main" must be a string`);
  }
  if (obj.kin !== undefined && typeof obj.kin !== 'string') {
    throw new ManifestError(`${fileHint}: "kin" must be a string`);
  }
  if (obj.dependencies !== undefined) {
    if (
      obj.dependencies === null ||
      typeof obj.dependencies !== 'object' ||
      Array.isArray(obj.dependencies)
    ) {
      throw new ManifestError(
        `${fileHint}: "dependencies" must be an object of name -> source`,
      );
    }
    for (const [depName, spec] of Object.entries(
      obj.dependencies as Record<string, unknown>,
    )) {
      if (!isValidPackageName(depName)) {
        throw new ManifestError(
          `${fileHint}: invalid dependency name "${depName}"`,
        );
      }
      if (typeof spec !== 'string' || spec.trim() === '') {
        throw new ManifestError(
          `${fileHint}: dependency "${depName}" source must be a non-empty string`,
        );
      }
    }
  }

  return obj as KinManifest;
}

export function readManifest(root: string): KinManifest {
  const file = manifestPath(root);
  if (!fs.existsSync(file)) {
    throw new ManifestError(`No ${path.basename(file)} found at ${root}`);
  }
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (e) {
    throw new ManifestError(
      `Failed to read ${file}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new ManifestError(
      `Invalid JSON in ${file}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return validateManifest(parsed, file);
}

export function writeManifest(root: string, manifest: KinManifest): void {
  validateManifest(manifest, manifestPath(root));
  const file = manifestPath(root);
  const body = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(file, body, 'utf-8');
}

/** Create a default manifest for a new project. */
export function defaultManifest(
  name: string,
  options: { version?: string; description?: string; main?: string } = {},
): KinManifest {
  if (!isValidPackageName(name)) {
    throw new ManifestError(
      `Invalid package name "${name}". Use lowercase letters, digits, hyphens, or underscores.`,
    );
  }
  return {
    name,
    version: options.version ?? '0.1.0',
    description: options.description ?? '',
    main: options.main ?? 'main.kin',
    dependencies: {},
  };
}
