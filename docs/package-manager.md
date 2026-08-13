# Kin Package Manager (first slice)

This is the initial package manager for Kin projects. It covers project
scaffolding, a manifest/lockfile, and installing dependencies from the local
filesystem or Git. **Language-level imports are not part of this slice** —
packages are placed under `kin_modules/` so tooling and a future module system
can resolve them.

Related issue: [kin-lang/kin#257](https://github.com/kin-lang/kin/issues/257)

## Quick start

```bash
# Scaffold a project in the current directory
kin init
# or: kin init ./my-app --name my-app

# Add a local package
kin pkg add path:./vendor/helpers
# Add a git package (optional #branch|tag|commit)
kin pkg add git+https://github.com/example/kin-utils.git#main

# Install everything from kin.json (also: kin install)
kin pkg install

# List / remove
kin pkg list
kin pkg remove helpers
```

## Project layout

| Path | Role |
|------|------|
| `kin.json` | Project / package manifest (name, version, dependencies) |
| `kin-lock.json` | Lockfile: resolved sources + integrity hashes |
| `kin_modules/<name>/` | Installed package trees (gitignored) |
| `main.kin` | Default entry file created by `kin init` |

### `kin.json`

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "description": "",
  "main": "main.kin",
  "dependencies": {
    "helpers": "path:./vendor/helpers",
    "utils": "git+https://github.com/example/kin-utils.git#main"
  }
}
```

Rules for this slice:

- `name` — lowercase letters, digits, `.`, `_`, `-` (no path separators, max 64 chars)
- `version` — semver-like `X.Y.Z` with optional pre-release/build suffix
- `dependencies` — map of package name → source string

### Dependency sources

| Form | Example |
|------|---------|
| Path (explicit) | `path:./vendor/foo` |
| Path (bare) | `./vendor/foo`, `/abs/path` |
| Git (explicit) | `git+https://github.com/org/pkg.git` |
| Git + ref | `git+https://github.com/org/pkg.git#v1.2.3` |
| Git (https .git URL) | `https://github.com/org/pkg.git` |

There is **no central registry** yet. Only path and git sources are supported.

### `kin-lock.json`

Written/updated by `kin pkg install` and `kin pkg add`. Example entry:

```json
{
  "lockfileVersion": 1,
  "packages": {
    "helpers": {
      "version": "1.2.3",
      "source": "path:./vendor/helpers",
      "sourceType": "path",
      "resolved": "/abs/path/to/vendor/helpers",
      "integrity": "sha256-..."
    }
  }
}
```

- **path** deps are re-copied on every install so local edits flow into `kin_modules/`.
- **git** deps are skipped when the lock entry still matches and the install dir exists.
- Integrity is a stable `sha256` over package files (excluding `.git`, nested `kin_modules`, `node_modules`, etc.).

### Package shape

A reusable package is a directory with its own `kin.json` (recommended) plus Kin sources:

```text
helpers/
  kin.json          # { "name": "helpers", "version": "1.0.0", "main": "lib.kin" }
  lib.kin
```

If `kin.json` is missing, the installer uses version `0.0.0` and derives the name from the directory or repo basename (or `--name`).

## CLI reference

```text
kin init [directory] [--name] [--pkg-version] [--description] [--main-file] [--force] [--no-stub]
kin install
kin pkg install
kin pkg add <spec> [--name <name>]
kin pkg remove <name>   # alias: rm
kin pkg list            # alias: ls
```

## Programmatic API

The same operations are exported from `@kin-lang/kin` for tools and tests:

```ts
import {
  initProject,
  addDependency,
  installAll,
  removeDependency,
  listPackagesNamed,
  findProjectRoot,
  resolveInstalledPackage,
  parseSource,
  readManifest,
  readLockfile,
} from '@kin-lang/kin';
```

`resolveInstalledPackage(name, cwd?)` returns the absolute path under
`kin_modules/` or `null` if missing.

## Out of scope (later slices)

- Language syntax for importing packages (`koresha`, etc.)
- Central package registry / publish command
- Semver range resolution across multiple versions
- Transitive dependency graph solving beyond a flat `dependencies` map
- Workspaces / monorepo linking beyond path deps

## Design notes

1. **Manifest first** — `kin.json` is the source of truth for what you want; the lockfile records what was resolved.
2. **Disk-visible installs** — everything lands in `kin_modules/` as plain files so editors and future loaders can open them without the package manager.
3. **Git via system git** — installs shell out to `git` on `PATH` (shallow clone when possible).
4. **Incremental** — this slice is intentionally small and mergeable; module loading can bind to `resolveInstalledPackage` later without changing the on-disk layout.
