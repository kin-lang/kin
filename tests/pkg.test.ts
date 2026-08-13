import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  initProject,
  installAll,
  addDependency,
  removeDependency,
  listPackagesNamed,
  readManifest,
  readLockfile,
  parseSource,
  findProjectRoot,
  resolveInstalledPackage,
  ManifestError,
  InstallError,
  InitError,
  SourceError,
  MANIFEST_FILE,
  LOCKFILE_FILE,
  MODULES_DIR,
} from '../src/index';
import { validateManifest } from '../src/pkg/manifest';
import { hashDirectory } from '../src/pkg/integrity';

function makeTempDir(prefix = 'kin-pkg-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writePackage(
  dir: string,
  name: string,
  version = '1.0.0',
  extraFiles: Record<string, string> = {},
): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'kin.json'),
    JSON.stringify(
      {
        name,
        version,
        main: 'lib.kin',
        description: `test package ${name}`,
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    path.join(dir, 'lib.kin'),
    `tangaza_amakuru("hello from ${name}")\n`,
  );
  for (const [rel, body] of Object.entries(extraFiles)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
}

describe('parseSource', () => {
  it('parses path: specs and bare relative paths', () => {
    const root = '/tmp/project';
    const a = parseSource('path:./vendor/foo', root);
    expect(a.type).toBe('path');
    expect(a.location).toBe(path.resolve(root, 'vendor/foo'));

    const b = parseSource('../lib', root);
    expect(b.type).toBe('path');
    expect(b.location).toBe(path.resolve(root, '../lib'));
  });

  it('parses git+ and https git URLs with optional ref', () => {
    const g = parseSource('git+https://github.com/org/pkg.git#main');
    expect(g.type).toBe('git');
    expect(g.location).toBe('https://github.com/org/pkg.git');
    expect(g.ref).toBe('main');

    const h = parseSource('https://github.com/org/pkg.git');
    expect(h.type).toBe('git');
    expect(h.location).toBe('https://github.com/org/pkg.git');
    expect(h.ref).toBeUndefined();
  });

  it('rejects empty and unrecognized sources', () => {
    expect(() => parseSource('')).toThrow(SourceError);
    expect(() => parseSource('some-registry-package')).toThrow(SourceError);
  });
});

describe('validateManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const m = validateManifest({
      name: 'demo',
      version: '0.1.0',
      dependencies: { util: 'path:./util' },
    });
    expect(m.name).toBe('demo');
  });

  it('rejects invalid names and versions', () => {
    expect(() => validateManifest({ name: 'Bad Name', version: '1.0.0' })).toThrow(
      ManifestError,
    );
    expect(() => validateManifest({ name: 'ok', version: 'v1' })).toThrow(
      ManifestError,
    );
  });
});

describe('initProject', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates kin.json, lockfile, and main.kin', () => {
    const result = initProject({ cwd: tmp, name: 'hello-kin' });
    expect(result.created).toBe(true);
    expect(fs.existsSync(path.join(tmp, MANIFEST_FILE))).toBe(true);
    expect(fs.existsSync(path.join(tmp, LOCKFILE_FILE))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'main.kin'))).toBe(true);

    const manifest = readManifest(tmp);
    expect(manifest.name).toBe('hello-kin');
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.main).toBe('main.kin');
    expect(manifest.dependencies).toEqual({});

    const lock = readLockfile(tmp);
    expect(lock.lockfileVersion).toBe(1);
    expect(lock.packages).toEqual({});
  });

  it('refuses to overwrite without force', () => {
    initProject({ cwd: tmp, name: 'once' });
    expect(() => initProject({ cwd: tmp, name: 'twice' })).toThrow(InitError);
    initProject({ cwd: tmp, name: 'twice', force: true });
    expect(readManifest(tmp).name).toBe('twice');
  });

  it('finds project root from a nested cwd', () => {
    initProject({ cwd: tmp, name: 'nested-root' });
    const nested = path.join(tmp, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(tmp);
  });
});

describe('path dependencies', () => {
  let project: string;
  let depA: string;
  let depB: string;

  beforeEach(() => {
    project = makeTempDir('kin-proj-');
    depA = makeTempDir('kin-dep-a-');
    depB = makeTempDir('kin-dep-b-');
    initProject({ cwd: project, name: 'app', createMain: true });
    writePackage(depA, 'helper', '1.2.3', { 'extra.txt': 'x' });
    writePackage(depB, 'other', '0.3.0');
  });

  afterEach(() => {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(depA, { recursive: true, force: true });
    fs.rmSync(depB, { recursive: true, force: true });
  });

  it('adds a path dependency, installs into kin_modules, and locks it', () => {
    const result = addDependency(`path:${depA}`, { cwd: project });
    expect(result.name).toBe('helper');
    expect(result.version).toBe('1.2.3');
    expect(result.sourceType).toBe('path');
    expect(result.action).toBe('installed');

    const installed = path.join(project, MODULES_DIR, 'helper');
    expect(fs.existsSync(path.join(installed, 'lib.kin'))).toBe(true);
    expect(fs.existsSync(path.join(installed, 'extra.txt'))).toBe(true);
    expect(fs.existsSync(path.join(installed, 'kin.json'))).toBe(true);

    const manifest = readManifest(project);
    expect(manifest.dependencies?.helper).toMatch(/^path:/);

    const lock = readLockfile(project);
    expect(lock.packages.helper.version).toBe('1.2.3');
    expect(lock.packages.helper.sourceType).toBe('path');
    expect(lock.packages.helper.integrity).toMatch(/^sha256-/);
    expect(lock.packages.helper.integrity).toBe(hashDirectory(depA));

    expect(resolveInstalledPackage('helper', project)).toBe(installed);

    const listed = listPackagesNamed({ cwd: project });
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe('helper');
  });

  it('installAll installs every listed dependency', () => {
    addDependency(`path:${depA}`, { cwd: project });
    addDependency(`path:${depB}`, { cwd: project, name: 'other' });

    // Wipe modules and reinstall from manifest/lock
    fs.rmSync(path.join(project, MODULES_DIR), { recursive: true, force: true });
    const report = installAll({ cwd: project });
    expect(report.results.map((r) => r.name).sort()).toEqual([
      'helper',
      'other',
    ]);
    expect(fs.existsSync(path.join(project, MODULES_DIR, 'helper'))).toBe(true);
    expect(fs.existsSync(path.join(project, MODULES_DIR, 'other'))).toBe(true);
  });

  it('removes a dependency from manifest, lock, and disk', () => {
    addDependency(`path:${depA}`, { cwd: project });
    removeDependency('helper', { cwd: project });

    expect(readManifest(project).dependencies?.helper).toBeUndefined();
    expect(readLockfile(project).packages.helper).toBeUndefined();
    expect(fs.existsSync(path.join(project, MODULES_DIR, 'helper'))).toBe(
      false,
    );
  });

  it('errors when install is run outside a project', () => {
    const empty = makeTempDir('kin-empty-');
    try {
      expect(() => installAll({ cwd: empty })).toThrow(InstallError);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('refreshes path dependency contents on reinstall', () => {
    addDependency(`path:${depA}`, { cwd: project });
    fs.writeFileSync(path.join(depA, 'lib.kin'), 'tangaza_amakuru("updated")\n');
    const report = installAll({ cwd: project });
    const helper = report.results.find((r) => r.name === 'helper');
    expect(helper).toBeTruthy();
    const installed = fs.readFileSync(
      path.join(project, MODULES_DIR, 'helper', 'lib.kin'),
      'utf-8',
    );
    expect(installed).toContain('updated');
  });
});

describe('git dependencies (local bare repo)', () => {
  let project: string;
  let repoDir: string;
  let remote: string;

  beforeEach(() => {
    project = makeTempDir('kin-git-proj-');
    repoDir = makeTempDir('kin-git-src-');
    remote = makeTempDir('kin-git-remote-');

    initProject({ cwd: project, name: 'git-app' });
    writePackage(repoDir, 'gitpkg', '2.0.0', { 'readme.md': 'from git' });

    execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: repoDir,
      stdio: 'ignore',
    });
    execFileSync('git', ['config', 'user.name', 'Test'], {
      cwd: repoDir,
      stdio: 'ignore',
    });
    execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'init'], {
      cwd: repoDir,
      stdio: 'ignore',
    });

    // Bare clone as remote URL (file://)
    execFileSync('git', ['clone', '--bare', repoDir, remote], {
      stdio: 'ignore',
    });
  });

  afterEach(() => {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(remote, { recursive: true, force: true });
  });

  it('installs from a local git remote and records commit in lockfile', () => {
    const url = `git+file://${remote}`;
    const result = addDependency(url, { cwd: project, name: 'gitpkg' });
    expect(result.name).toBe('gitpkg');
    expect(result.version).toBe('2.0.0');
    expect(result.sourceType).toBe('git');
    expect(result.resolved).toMatch(/#/);
    expect(result.integrity).toMatch(/^sha256-/);

    const installed = path.join(project, MODULES_DIR, 'gitpkg');
    expect(fs.existsSync(path.join(installed, 'lib.kin'))).toBe(true);
    expect(fs.existsSync(path.join(installed, 'readme.md'))).toBe(true);
    // .git should not be present in the installed tree
    expect(fs.existsSync(path.join(installed, '.git'))).toBe(false);

    const lock = readLockfile(project);
    expect(lock.packages.gitpkg.sourceType).toBe('git');
    expect(lock.packages.gitpkg.resolved).toContain('#');

    // Second install should be unchanged (git, same lock)
    const report = installAll({ cwd: project });
    const again = report.results.find((r) => r.name === 'gitpkg');
    expect(again?.action).toBe('unchanged');
  });
});

describe('hashDirectory stability', () => {
  it('is order-independent and content-sensitive', () => {
    const a = makeTempDir('kin-hash-a-');
    const b = makeTempDir('kin-hash-b-');
    try {
      writePackage(a, 'p', '1.0.0', { 'z.txt': '1', 'a.txt': '2' });
      writePackage(b, 'p', '1.0.0', { 'a.txt': '2', 'z.txt': '1' });
      expect(hashDirectory(a)).toBe(hashDirectory(b));
      fs.writeFileSync(path.join(b, 'a.txt'), 'changed');
      expect(hashDirectory(a)).not.toBe(hashDirectory(b));
    } finally {
      fs.rmSync(a, { recursive: true, force: true });
      fs.rmSync(b, { recursive: true, force: true });
    }
  });
});
