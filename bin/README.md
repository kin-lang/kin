<p align="center">
  <a href="https://kinlang.vercel.app/" target="blank"><img src="https://github.com/kin-lang/kin/blob/main/public/kin-logo.svg" width="120" alt="Kin Logo" /></a>
</p>

<p align="center">Write computer programs in Kinyarwanda! </p>

**Kin** is a straightforward programming language created with the purpose of aiding Kinyarwanda speakers in easily learning programming.

> This is CLI package for Kin Programming Language

## Installation

### npm (requires Node.js)

```shell
npm i -g @kin-lang/kin
```

### Windows executable (no Node.js required)

Download `kin-win-x64.exe` from the [latest GitHub Release](https://github.com/kin-lang/kin/releases/latest). No Node.js install is needed.

```shell
kin-win-x64.exe <command> <arguments>
```

You can rename the file to `kin.exe` if you prefer.

### Build the executable from source

```shell
npm install
npm run build:exe   # outputs release/kin-win-x64.exe
```

## Usage

```shell
kin <command> <arguments>
```

| Command | Description |
|---------|-------------|
| `kin repl` | Interactive REPL |
| `kin run <file>` | Run a `.kin` file |
| `kin check <file>` | Parse and report diagnostics |
| `kin init [dir]` | Create `kin.json`, lockfile, and `main.kin` |
| `kin install` | Install dependencies into `kin_modules/` |
| `kin pkg add <spec>` | Add a path or git dependency |
| `kin pkg list` | List locked packages |
| `kin pkg remove <name>` | Remove a dependency |

Package manager details: [docs/package-manager.md](../docs/package-manager.md).

## License

Kin's CLI is under MIT license.
