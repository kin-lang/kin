# Kin Programming Language – Architecture & Contributor Guide

## Overview

Kin is a programming language that allows users to write computer programs in Kinyarwanda. This document explains the architecture, data flow, and main components of the Kin project, making it easier for new contributors to understand, extend, and debug the system.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Execution Flow (from CLI to Evaluation)](#3-execution-flow)
4. [Core Components](#4-core-components)
5. [Control-flow signals](#5-control-flow-signals)
6. [Diagnostics pipeline](#6-diagnostics-pipeline)
7. [Value model](#7-value-model)
8. [Type system](#8-type-system)
9. [OOP model](#9-oop-model)
10. [Modules](#10-modules)
11. [How to add a builtin](#11-how-to-add-a-builtin)
12. [Adding Features & Contributing](#12-adding-features--contributing)

---

## 1. High-Level Architecture

Kin is implemented as a **tree-walk interpreter**. After parsing, the interpreter walks the Abstract Syntax Tree (AST) and evaluates each node recursively. This keeps the barrier low for student contributors: each language feature is a node type plus an evaluation function.

```
Kin Source Code
      │
      ▼
   [Lexer]          tokens with {type, lexeme, line, column, start, end}
      │
      ▼
   [Parser]         AST nodes with span; optional Diagnostic[]
      │
      ▼
[Interpreter]       tree-walk evaluate() + method-context stack
      │
      ▼
[Runtime/Environment]  scopes, types, ArrayVal / ObjectVal / ClassVal / InstanceVal
      │
      ▼
[Modules]           koresha load/cache (optional nested files)
```

---

## 2. Directory Structure

```
kin/
├── bin/kin.ts              # CLI: repl, run, check
├── src/
│   ├── index.ts            # Public API exports
│   ├── lexer/              # Tokens + spans
│   ├── parser/             # AST factories, recursive descent
│   ├── runtime/
│   │   ├── interpreter.ts  # evaluate() + methodContextStack
│   │   ├── environment.ts  # scopes, member access, types map
│   │   ├── values.ts       # RuntimeVal, MK_*, ClassVal, TypeVal, …
│   │   ├── types.ts        # Resolve annotations, valueMatchesType
│   │   ├── oop.ts          # imiterere / rema / bound methods
│   │   ├── modules.ts      # koresha / emerera_gukoresha
│   │   ├── path-resolve.ts # relative paths for modules & files
│   │   ├── signals.ts      # ReturnSignal, BreakSignal, ContinueSignal
│   │   ├── truthy.ts
│   │   ├── methods.ts      # arr.ingano() / string methods
│   │   ├── native.ts       # defineNative helper
│   │   ├── globals.ts      # Builtin registry
│   │   ├── print.ts
│   │   ├── in-built/       # io, math, strings, time, arrays, files
│   │   └── eval/           # statements + expressions
│   ├── lib/
│   │   ├── errors.ts       # KinError subclasses + CODE_CATEGORY
│   │   ├── messages.ts     # Catalog loader
│   │   ├── render-error.ts # Code frames
│   │   ├── span.ts
│   │   └── log.ts
│   └── messages/           # en.json, rw.json
├── docs/errors.md          # Error catalog (teaching material)
├── examples/               # top-level, oop/, importing/
├── tests/
├── grammar.bnf
├── ARCHITECTURE.md
└── CHANGELOG.md
```

---

## 3. Execution Flow

### CLI ([bin/kin.ts](bin/kin.ts))

- `repl` – interactive loop
- `run <file>` – parse (with recovery), refuse to evaluate if diagnostics, else run
- `check <file>` – parse and print diagnostics only

### Data flow

1. Source text is tokenized (lexer tracks line, column, start, end).
2. `Parser.parse(source)` returns `{ program, diagnostics }`.
   `Parser.produceAST(source)` throws on the first error (back-compat for library callers).
3. If there are error diagnostics, the CLI prints them and exits.
4. `createGlobalEnv(filename)` builds the root environment (`filename` is the entry path).
5. `Interpreter.evaluate(ast, env)` walks the tree. Runtime faults are `KinError` with codes and spans.
6. Nested `koresha` loads modules into child environments and caches export objects per root env.
7. The CLI renders errors with a rustc-style code frame (`ikosa[K005]: ...`).

---

## 4. Core Components

### Lexer

Produces `Token[]` with full spans. Numbers are non-negative tokens only; unary minus is a parser concern so `x -5` is subtraction.

Keywords include control flow (`niba`, `subiramo_niba`, …), types (`ubwoko`), OOP (`imiterere`, `tegura`, `rema`, `rusange`, `bwite`, `ikomoka`), and modules (`koresha`, `nka`, `emerera_gukoresha`). Single `|` and `?` are tokens for type unions and optional types.

### Parser

Index cursor (`pos`) over the token array: `at()`, `eat()`, `peek(offset)`, `not_eof()`. `eat()` never advances past EOF. Linear time even on large files.

Expression precedence (low to high): assignment, logical (`&&` `||`), relational, additive, multiplicative (`*` `/` `%`), exponent (`^`, right-assoc), call/member / `rema`, primary (array/object literals, unary `!` / `-` / `ubwoko`).

AST nodes are built with factory helpers in `ast.ts` so every node has a required `span`. Types are **not erased**: annotations and type aliases remain on the AST through runtime.

### Interpreter

`Interpreter.evaluate` dispatches on `node.kind` and tracks `currentSpan` for runtime errors.

**Method context stack** (for OOP privacy):

- `pushMethodContext` / `popMethodContext` on enter/exit of `tegura` and methods.
- Freestanding `porogaramu_ntoya` calls **suspend** the stack so callbacks cannot use ambient private access.
- Stored on the interpreter, not on `Environment`, so nested plain functions cannot keep constructor privileges.

### Environment

Parent-chained scopes. Holds:

- Value bindings + constants
- Optional per-binding `ResolvedType` for annotated variables
- Type alias map (`declareType` / `lookupType`)

`lookupMember` / `assignMember` handle objects, arrays, and class **instances** (fields + bound methods + visibility). `lookupOrMutObject` remains as a deprecated alias for the published API. `getRoot()` walks to the root env (module cache key).

---

## 5. Control-flow signals

Control flow uses exception-style signals:

| Signal | Thrown by | Caught by |
|--------|-----------|-----------|
| `ReturnSignal` | `tanga` | `eval_call_expr`, bound methods |
| `BreakSignal` | `hagarara` | `eval_loop_statement` |
| `ContinueSignal` | `komeza` | `eval_loop_statement` |

- A `BreakSignal` or `ContinueSignal` that escapes a function becomes a Kin error (K019).
- Top-level stray signals become K013 / K014 / K015.
- The parser still rejects `komeza` outside a loop at compile time (`loopDepth`).
- There is no `FunctionTerminator` AST node anymore.

---

## 6. Diagnostics pipeline

1. **Spans** on every token and AST node: `{ start, end, line, column }`.
2. **KinError** with stable code (`K001`...), category (`ERRNAME` / `ERRCODE`), optional span, and interpolation params.
3. **Message catalog** in `src/messages/{rw,en}.json`. Default language Kinyarwanda; `KIN_LANG=en` switches. Missing Kinyarwanda keys fall back to English.
4. **Renderer** prints:

```
ikosa[K005]: Ntabwo hashobora gushakisha 'c' kuko ntabwo ihari
 --> program.kin:1:17
  |
1 | tangaza_amakuru(c)
  |                 ^
```

Colour is used when stdout is a TTY.

5. **Error recovery** in `parse()`: on error, record a diagnostic, skip to the next statement keyword, continue. `produceAST` still throws on first error.

See [docs/errors.md](docs/errors.md) for the full code table (including type K032–K036, OOP K037–K043, modules K044–K046). Source spans are also used by the [VS Code extension](https://github.com/kin-lang/vscode-intellisense) for range-accurate diagnostics.

---

## 7. Value model

| Runtime type | Constructor / notes |
|--------------|---------------------|
| `null` | `MK_NULL` — printed as `ubusa` |
| `number` | `MK_NUMBER` |
| `boolean` | `MK_BOOL` — `nibyo` / `sibyo` |
| `string` | `MK_STRING` |
| `object` | `MK_OBJECT` — plain bags (`ubwoko_imiterere`) |
| `array` | `MK_ARRAY` — `urutonde` |
| `fn` / `native-fn` | user functions / builtins |
| `class` | `ClassVal` from `imiterere` |
| `instance` | `InstanceVal` from `rema` |
| `type-val` | shared tags from prefix `ubwoko` |
| `bound-method` | method closed over receiver |

**`ubwoko` (prefix operator)** returns a **type value**, not a string:

- Primitives → shared `TypeVal` singletons (`ubwoko 5 == ubwoko 10`)
- Instances → the **class value** itself (`ubwoko keza == Umuntu`)
- Classes → shared “imiterere” type tag
- User `fn` and `native-fn` share one function type tag
- When printed, type values show Kinyarwanda names (`umubare`, `ijambo`, …)

Arrays print as `[1, 2, 3]`. Out-of-range index raises K016. Method dispatch: `arr.ingano()`, `s.inyuguti_nkuru()` via `methods.ts`. Namespace forms `KIN_URUTONDE.*` / `KIN_AMAGAMBO.*` remain.

**Truthiness** (`isTruthy`): `sibyo`, `ubusa`, and `0` are false; everything else is true.

**Operators**: dispatch table by operand types; fallthrough is K012. String `+` string concatenates; string `+` number coerces the number.

**Equality**: structural for arrays; identity for objects, classes, instances, type-vals, functions.

---

## 8. Type system

Types are tokenized, parsed, and **checked at runtime** (not erased).

### Annotations

```kin
reka age: umubare = 25
reka name: ijambo? = ubusa          # optional: type | ubusa
porogaramu_ntoya add(a: umubare, b: umubare): umubare { tanga a + b }
```

Built-in names: `umubare`, `ijambo`, `ukuri`, `ubwoko_imiterere`, `urutonde`, `porogaramu_ntoya`, `_porogaramu_ntoya`, `ubusa`.

### Aliases, unions, Fata

```kin
ubwoko Id = ijambo | umubare
ubwoko Person = { name: ijambo, age: umubare }
ubwoko NameOnly = Fata<Person, "name">
```

`src/runtime/types.ts` resolves AST type nodes to `ResolvedType` and checks values on declare / assign / call / return (K035 on mismatch).

Unannotated bindings stay dynamic.

---

## 9. OOP model

| Keyword | Role |
|---------|------|
| `imiterere` | Class declaration |
| `tegura` | Constructor |
| `rema` | Instantiate |
| `_` | Current instance (in tegura / methods) |
| `rusange` / `bwite` | Public / private |
| `ikomoka` | Single inheritance |

Implementation: `src/runtime/oop.ts` + instance member access in `environment.ts`.

Rules (see `examples/oop/`):

- Fields only via `rusange/bwite _.name = expr` inside `tegura`
- Methods require visibility; bound methods keep the receiver
- Private access only from the **declaring** class’s active method/ctor frame
- Freestanding functions suspend that frame
- Method lookup walks parents; child `tegura` replaces parent constructor
- Class names are **exact** type annotations (no inheritance widening)

---

## 10. Modules

| Keyword | Role |
|---------|------|
| `koresha` | Import a file |
| `nka` | Namespace alias (English *as*) |
| `emerera_gukoresha` | Explicit export list |

```kin
# lib.kin
porogaramu_ntoya guteranya(a: umubare, b: umubare): umubare { tanga a + b }
emerera_gukoresha { guteranya }

# main.kin
koresha "./lib.kin" nka math
tangaza_amakuru(math.guteranya(2, 3))
```

Implementation: `src/runtime/modules.ts` + `path-resolve.ts`.

- Module body runs in a child of the root env (builtins inherited)
- Exports become properties of a constant namespace object bound to the alias
- Load-once cache per root env; circular imports → K045; missing file → K044
- Nested relative paths resolve against the **current** file (stack in `path-resolve.ts`)
- Exported classes work as values (`rema m.Umuntu(...)`); class types may re-register under bare names for annotations

Samples: `examples/importing/`.

---

## 11. How to add a builtin

Prefer `defineNative` from `src/runtime/native.ts`:

```ts
import { defineNative } from './native';
import { MK_NUMBER, NumberVal } from './values';

// Inside createGlobalEnv / createKinImibare, on a namespace Map or the env:
.set(
  'umuzikare',
  defineNative({
    name: 'KIN_IMIBARE.umuzikare',
    params: ['number'],
    fn: (args) => MK_NUMBER(Math.sqrt((args[0] as NumberVal).value)),
  }),
)
```

- `params` checks types (`string`, `number`, `boolean`, `array`, `object`, `any`).
- `minArgs` / `maxArgs` override arity when needed.
- Errors use consistent K017 / K018 messages.
- For methods on values (not namespaces), register them in `src/runtime/methods.ts`.
- Domain implementations live under `src/runtime/in-built/` (io, math, strings, time, arrays, files).

---

## 12. Adding Features & Contributing

1. Read this document and `grammar.bnf`.
2. Keep the code approachable: plain functions and classes over clever abstractions.
3. Add tests for every behaviour change. Bug fixes get a regression test.
4. Update `grammar.bnf` and this file when behaviour or structure changes.
5. Keep error messages and docs aligned with the wiki vocabulary (ikosa, ubusa, urutonde, umubare, …).
6. Conventional commits: `fix:`, `feat:`, `refactor:`, `docs:`, `test:`.
7. Verify: `npm run lint`, `npm test`, `npm run build`, `npm run test:examples:cli`.

Published API in `src/index.ts` (Parser, Lexer, Interpreter, createGlobalEnv, Environment, MK_* helpers, value types, KinError helpers) must keep working. `Environment.lookupOrMutObject` stays as a deprecated alias.

Related repos (keep in sync when language surface changes):

- [vscode-intellisense](https://github.com/kin-lang/vscode-intellisense) — highlighting, catalog, diagnostics
- [wiki](https://github.com/kin-lang/wiki) — user documentation
- [editor](https://github.com/kin-lang/editor) — web playground
