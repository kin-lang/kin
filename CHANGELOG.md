# Changelog

All notable changes to `@kin-lang/kin` are documented in this file.

## Unreleased

### Features

- **Type system (runtime-checked, not erased)**
  - Annotations on `reka` / `ntahinduka`, function parameters, and return types
  - Built-in names: `umubare`, `ijambo`, `ukuri`, `ubwoko_imiterere`, `urutonde`, `porogaramu_ntoya`, `_porogaramu_ntoya`, `ubusa`
  - Optional types (`umubare?`), aliases (`ubwoko Name = …`), unions (`A | B`), `Fata<T, "k">` (Pick)
  - Nested / chained object types
  - Mismatch error K035: *Cannot assign a umubare to a ijambo…*
- **`ubwoko` as prefix type-value operator**
  - Returns shared type tags / class values for identity comparison (not plain strings)
  - Still declares type aliases: `ubwoko Person = { name: ijambo }`
- **OOP (first slice)** — see `examples/oop/`
  - `imiterere`, `tegura`, `rema`, `_`, `rusange` / `bwite`, `ikomoka`
  - Bound methods, exact class type annotations, private access via method-context stack
  - Freestanding functions suspend private privileges (K041)
- **Multi-file modules** — see `examples/importing/`
  - `koresha "./file.kin" nka alias` (namespace import; English *as* → **`nka`**)
  - `emerera_gukoresha { name1, name2 }` explicit exports
  - Load-once cache; relative paths; circular import K045; missing file K044
  - Works with types and exported classes (`rema people.Umuntu(...)`)
- Examples CLI and tests cover `examples/`, `examples/oop/`, and `examples/importing/`

### Docs

- Restored `ARCHITECTURE.md` and `CHANGELOG.md` (removed in `15779ff`) and updated for types, OOP, and modules
- `grammar.bnf` and `docs/errors.md` extended (K032–K046)

---

## 0.5.0

### Breaking Changes

- **Array type**: array literals produce `ArrayVal` (`type: "array"`), not objects with string keys. `ubwoko([1,2])` returns `urutonde` instead of `object`.
- **Out-of-range index**: `arr[i]` raises a Kin error when `i` is out of range instead of returning `ubusa`.
- **Lexer negatives**: `-5` is no longer a single numeric token. `x -5` parses as subtraction. Use unary minus for negative literals (`-5`, `-x`).
- **Truthiness**: `niba` / `subiramo_niba` use truthiness. `sibyo`, `ubusa`, and `0` are false; everything else (including non-zero numbers) is true. Previously only `=== true` booleans took the then-branch.
- **Operator type errors**: mismatched operands raise a Kin error instead of silently returning `ubusa`. String `+` string (and string `+` number) now concatenates.
- **Exponent precedence**: `^` is right-associative and binds tighter than `*` / `/`. `2 ^ 3 ^ 2` is `512`; `2 * 3 ^ 2` is `18`.
- **Control flow**: `tanga`, `hagarara`, and `komeza` use exception-style signals. `tanga` really leaves the function; `hagarara`/`komeza` cannot cross a function boundary.

### Features

- Parser uses an index cursor (linear time on large files).
- Diagnostics with source spans, stable codes (`K001`...), message catalog, and rustc-style code frames.
- `kin check <file>` parses and reports diagnostics without executing.
- `Parser.parse()` returns `{ program, diagnostics }` with error recovery; `produceAST()` still throws on the first error.
- Real `ArrayVal` and `KIN_URUTONDE` rewritten against it; method form `arr.ingano()`, `izina.inyuguti_nkuru()`.
- `defineNative` helper for builtins with shared arity/type checks.
- Unary minus expression; array/object literal postfix indexing.

### Fixes

- `gereranya` with only `ibindi` runs the default body.
- `KIN_URUTONDE.ifite` checks every element with runtime equality.
- Duplicate `Kin Error:` prefix and quoted parser messages cleaned up.
- Duplicate AST interface declarations removed.

### Docs

- `grammar.bnf`, `ARCHITECTURE.md`, `README.md`, and `docs/errors.md` updated.
