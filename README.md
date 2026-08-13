<p align="center">
  <img src="https://github.com/kin-lang/kin/blob/main/public/kin-logo.svg" width="120" alt="Kin Logo" />
</p>

<p align="center">Write computer programs in Kinyarwanda! </p>
<p align="center">
  <a href="https://kinlang.vercel.app/getting-started">Getting Started</a> .
  <a href="https://kinlang.vercel.app/#why">Why Kin?</a> .
  <a href="https://marketplace.visualstudio.com/items?itemName=pacifiquem.kinlang">VS Code (highlighting, diagnostics, completions)</a> .
  <a href="https://github.com/kin-lang/showcase"> Show us what you did! </a>
</p>

<div align="center">
  
![GitHub](https://img.shields.io/github/license/kin-lang/kin) . ![GitHub last commit](https://img.shields.io/github/last-commit/kin-lang/kin) . ![Version](https://img.shields.io/npm/v/@kin-lang/kin) . ![Stars](https://img.shields.io/github/stars/kin-lang/kin) . ![Issues](https://img.shields.io/github/issues/kin-lang/kin)

</div>

## Description

**Kin** is a straightforward programming language created with the purpose of aiding Rwandans to write computer programs in their native language Kinyarwanda.

## Installation

You can install Kin in one of two ways:

### Option 1: npm (requires Node.js)

If you already have [Node.js](https://nodejs.org/) installed:

```shell
npm i -g @kin-lang/kin
```

Then run Kin from any terminal:

```shell
kin --version
kin repl
kin run path/to/program.kin
kin check path/to/program.kin
```

### Option 2: Standalone Windows executable (no Node.js required)

If you are on Windows and do **not** have Node.js installed, download the pre-built executable from the [latest GitHub Release](https://github.com/kin-lang/kin/releases/latest):

1. Go to [Releases](https://github.com/kin-lang/kin/releases)
2. Download `kin-win-x64.exe`
3. Place it somewhere convenient (for example `C:\kin\`)
4. Optionally add that folder to your system `PATH`
5. Run it from Command Prompt or PowerShell:

```shell
kin-win-x64.exe --version
kin-win-x64.exe repl
kin-win-x64.exe run path\to\program.kin
```

> You can rename `kin-win-x64.exe` to `kin.exe` for shorter commands.

This executable is built with [pkg](https://github.com/vercel/pkg) and bundles the Kin runtime so you do not need Node.js separately.

### VS Code

Install the official extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=pacifiquem.kinlang) (search **kinlang**). It provides syntax highlighting, parser diagnostics, completions, and hover docs for built-ins. Source: [kin-lang/vscode-intellisense](https://github.com/kin-lang/vscode-intellisense).

#### Building the executable yourself

Maintainers and contributors can build the Windows `.exe` locally:

```shell
npm install
npm run build:exe
```

The output is written to `release/kin-win-x64.exe`. To build for multiple platforms:

```shell
npm run build:exe:all
```

## Why Kin?

- **Goal**:
  Kin's main objective is to make learning programming more accessible by using Kinyarwanda, the native language for Rwandans.
- **Focus**:
  It's a straightforward language, prioritizing easy of use over complex features. This makes it suitable for education purpose.
- **Use Cases**:
  While Kin is great for learning the fundamentals, it's suitability for large-scale software development isn't guaranteed.

## What does it look like

- This is implementation of linear search:

  ```Kin
  reka arr = [45, 56, 334, 78, 34, 78, 23, 90]

  reka i = 0

  reka key = 23

  subiramo_niba(i < KIN_URUTONDE.ingano(arr)) {
    niba (arr[i] == key) {
      tangaza_amakuru("Key ", key, " is on ", i + 1, " position")
    }

    i = i + 1
  }
  ```

- Hello \<name\> !
  ```Kin
  reka name = injiza_amakuru("Enter your name: ")
  tangaza_amakuru("Hello ", name, "!")
  ```
- Executing system commands
  ```Kin
  sisitemu("sudo shutdown now")
  ```

## Syntax

Though **Kin** inherited it's syntax and structure from **JavaScript**, they're completely different when it comes to behavior.
Some notable **Kin**'s syntax rules are:

- Semicolon:
  - A semicolon is required when you declare a variable but you don't assign a value to it.
    ```Kin
     reka x; # This will work
    ```
  - A semicolon is required when a function returns but there's not expression to return.
    ```Kin
    porogaramu_ntoya main() {
      tanga; # This will work
    }
    ```
    > In General a semicolon is used to tell Kin that there's an ommited statement.
- White spaces:
  - Kin ignores white spaces, that's why multiple lines can be written at the same line ... these codes are equivalens
    ```Kin
    reka x = 5
    reka x=5
    ```



### Truthiness

In `niba`, `nanone_niba`, and `subiramo_niba`, values are tested for truthiness:

- **false**: `sibyo`, `ubusa`, and the number `0`
- **true**: everything else (non-zero numbers, non-empty and empty strings, arrays, objects, functions)

### String concatenation

`+` on two strings concatenates them. A string and a number also concatenate (the number is coerced), so beginners can write `"Ufite imyaka " + imyaka`.

### Arrays

Array literals produce a real array value (`urutonde`). Index out of range raises an error.

```Kin
reka arr = [10, 20, 30]
tangaza_amakuru(arr[0])              # 10
tangaza_amakuru(KIN_URUTONDE.ingano(arr))
tangaza_amakuru(arr.ingano())          # method form
tangaza_amakuru(KIN_URUTONDE.ifite(arr, 20))  # nibyo
```

### Importing other files

Use `injiza("path.kin")` to load another Kin file into the **program (global) environment**. Variables and functions declared at the top level of the imported file become available everywhere after the call — including when `injiza` is invoked from inside a function, `niba`, or loop. Paths are resolved relative to the file that contains `injiza`. Each file is loaded once per run (re-import is a no-op). Circular imports raise an error. Two files that declare the same name raise `K007`.

If an import fails mid-file, **top-level name bindings** introduced during that import (including nested successful `injiza`s under it) are rolled back and those paths may be loaded again. Rollback is **not** deep: mutations to existing objects/arrays and host side effects (prints, file I/O) are not undone.
```Kin
# utils.kin
porogaramu_ntoya ongera(a, b) {
  tanga a + b
}

# main.kin
injiza("utils.kin")
tangaza_amakuru(ongera(2, 3))  # 5
```

Embedders running a file should wrap evaluation with `withCurrentFile` (exported from `@kin-lang/kin`) so nested relative paths resolve correctly — the CLI already does this.

### Checking a file without running it

```shell
kin check path/to/program.kin
```

Reports parse diagnostics for **that single file** (with line, column, and a caret) and exits non-zero when there are errors. It does **not** follow `injiza()` imports — use `kin run` to surface errors inside dependencies. Useful for teachers and CI on individual files.

## Fun fact!

- Multiple statements can be written on the same line.

  ```Kin
  reka name = injiza_amakuru("Enter your name: ") tangaza_amakuru("Hello ", name, "!")
  ```

- Nested statements are also supported.
  ```Kin
  tangaza_amakuru("Hello ", injiza_amakuru("Enter your name: "), "!")
  ```

---

## Contributing

We still have a long way to go with Kin, we're calling for your contributions!
Contributions are welcomed, refer to [Contiributing.md](https://github.com/kin-lang/kin/blob/main/contributing.md) for futher info.

## Maintainers

This language is maintained by [@pacifiquem](https://github.com/pacifiquem).

## License

This project is under [MIT License](https://github.com/kin-lang/kin/blob/main/LICENSE).

<br>
<br>

<p align="right" style="color: gray; font: bold;">PACIFIQUE Murangwa - Author</p>
