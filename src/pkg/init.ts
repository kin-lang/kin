import * as fs from 'fs';
import * as path from 'path';
import { defaultManifest, writeManifest } from './manifest';
import { isValidPackageName } from './names';
import { emptyLockfile, writeLockfile } from './lockfile';
import {
  containProjectRelativePath,
  MANIFEST_FILE,
  PathError,
} from './paths';

export class InitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InitError';
  }
}

export interface InitOptions {
  /** Directory to initialize. Defaults to cwd. */
  cwd?: string;
  /** Package name. Defaults to the directory basename. */
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  /** Create a stub main.kin if missing. Default true. */
  createMain?: boolean;
  /** Overwrite an existing kin.json. Default false. */
  force?: boolean;
}

export interface InitResult {
  root: string;
  manifestPath: string;
  mainPath: string | null;
  created: boolean;
}

/**
 * Initialize a Kin project: write kin.json, optional main.kin, empty lockfile.
 */
export function initProject(options: InitOptions = {}): InitResult {
  const root = path.resolve(options.cwd ?? process.cwd());
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  if (!fs.statSync(root).isDirectory()) {
    throw new InitError(`Not a directory: ${root}`);
  }

  const manifestFile = path.join(root, MANIFEST_FILE);
  if (fs.existsSync(manifestFile) && !options.force) {
    throw new InitError(
      `${MANIFEST_FILE} already exists in ${root}. Use --force to overwrite.`,
    );
  }

  const dirName = path.basename(root);
  const rawName = options.name ?? sanitizeName(dirName);
  if (!isValidPackageName(rawName)) {
    throw new InitError(
      `Invalid package name "${rawName}". Pass --name with a valid name (lowercase letters, digits, hyphens, underscores).`,
    );
  }

  let main: string;
  try {
    main = containProjectRelativePath(
      root,
      options.main ?? 'main.kin',
      'entry file',
    );
  } catch (e) {
    if (e instanceof PathError) {
      throw new InitError(e.message);
    }
    throw e;
  }

  const manifest = defaultManifest(rawName, {
    version: options.version,
    description: options.description,
    main,
  });
  writeManifest(root, manifest);
  writeLockfile(root, emptyLockfile());

  let mainPath: string | null = null;
  const createMain = options.createMain !== false;
  const mainAbs = path.join(root, main);
  if (createMain && !fs.existsSync(mainAbs)) {
    // Ensure parent dirs exist for nested entry files (e.g. src/main.kin).
    fs.mkdirSync(path.dirname(mainAbs), { recursive: true });
    const stub = `# ${rawName}\ntangaza_amakuru("Muraho from ${rawName}!")\n`;
    fs.writeFileSync(mainAbs, stub, 'utf-8');
    mainPath = mainAbs;
  } else if (fs.existsSync(mainAbs)) {
    mainPath = mainAbs;
  }

  return {
    root,
    manifestPath: manifestFile,
    mainPath,
    created: true,
  };
}

function sanitizeName(input: string): string {
  const lower = input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return lower.replace(/^-+/, '').replace(/-+$/, '') || 'kin-project';
}
