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
8. [How to add a builtin](#8-how-to-add-a-builtin)
9. [Adding Features & Contributing](#9-adding-features--contributing)

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
[Interpreter]       tree-walk evaluate()
      │
      ▼
[Runtime/Environment]  scopes, ArrayVal / ObjectVal, natives
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
│   │   ├── interpreter.ts
│   │   ├── environment.ts
│   │   ├── values.ts       # RuntimeVal, MK_*, ArrayVal
│   │   ├── signals.ts      # ReturnSignal, BreakSignal, ContinueSignal
│   │   ├── truthy.ts
│   │   ├── methods.ts      # arr.ingano() / string methods
│   │   ├── native.ts       # defineNative helper
│   │   ├── globals.ts      # Builtin registry
│   │   ├── print.ts
│   │   └── eval/           # statements + expressions
│   ├── lib/
│   │   ├── errors.ts       # KinError
│   │   ├── messages.ts     # Catalog loader
│   │   ├── render-error.ts # Code frames
│   │   ├── span.ts
│   │   └── log.ts
│   └── messages/           # en.json, rw.json
├── docs/errors.md          # Error catalog (teaching material)
├── examples/
├── tests/
├── grammar.bnf
└── ARCHITECTURE.md
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
4. `Interpreter.evaluate(ast, env)` walks the tree. Runtime faults are `KinError` with codes and spans.
5. The CLI renders errors with a rustc-style code frame (`ikosa[K005]: ...`).

---

## 4. Core Components

### Lexer

Produces `Token[]` with full spans. Numbers are non-negative tokens only; unary minus is a parser concern so `x -5` is subtraction.

### Parser

Index cursor (`pos`) over the token array: `at()`, `eat()`, `peek(offset)`, `not_eof()`. `eat()` never advances past EOF. Linear time even on large files.

Expression precedence (low to high): assignment, logical (`&&` `||`), relational, additive, multiplicative (`*` `/` `%`), exponent (`^`, right-assoc), call/member, primary (including array/object literals and unary `!` / `-`).

AST nodes are built with factory helpers in `ast.ts` so every node has a required `span`.

### Interpreter

`Interpreter.evaluate` dispatches on `node.kind` and tracks `currentSpan` for runtime errors.

### Environment

Parent-chained scopes. `lookupMember` / `assignMember` handle objects and arrays. `lookupOrMutObject` remains as a deprecated alias for the published API.

---

## 5. Control-flow signals

Static flags for return/break/continue were incorrect (shared across interpreters, did not unwind nested blocks). Kin uses the Crafting Interpreters (jlox) pattern:

| Signal | Thrown by | Caught by |
|--------|-----------|-----------|
| `ReturnSignal` | `tanga` | `eval_call_expr` |
| `BreakSignal` | `hagarara` | `eval_loop_statement` |
| `ContinueSignal` | `komeza` | `eval_loop_statement` |

- A `BreakSignal` or `ContinueSignal` that escapes a function becomes a Kin error (K019).
- Top-level stray signals become K013 / K014 / K015.
- The parser still rejects `komeza` outside a loop at compile time (`loopDepth`).
- There is no `FunctionTerminator` AST node anymore.

---

## 6. Diagnostics pipeline

1. **Spans** on every token and AST node: `{ start, end, line, column }`.
2. **KinError** with stable code (`K001`...), optional span, and interpolation params.
3. **Message catalog** in `src/messages/{rw,en}.json`. Default language Kinyarwanda; `KIN_LANG=en` switches. Missing or `TODO(rw):` Kinyarwanda keys fall back to English.
4. **Renderer** prints:

```
ikosa[K005]: Cannot resolve 'c' as it does not exist
 --> program.kin:1:17
  |
1 | tangaza_amakuru(c)
  |                 ^
```

Colour is used when stdout is a TTY.

5. **Error recovery** in `parse()`: on error, record a diagnostic, skip to the next statement keyword, continue. `produceAST` still throws on first error.

See [docs/errors.md](docs/errors.md) for the full code table.

**Follow-up:** these spans let [kin-lang/vscode-intellisense](https://github.com/kin-lang/vscode-intellisense) draw squiggles on exact ranges instead of whole lines.

---

## 7. Value model

| Runtime type | Constructor | Notes |
|--------------|-------------|-------|
| `null` | `MK_NULL` | printed as `ubusa` |
| `number` | `MK_NUMBER` | |
| `boolean` | `MK_BOOL` | `nibyo` / `sibyo` |
| `string` | `MK_STRING` | |
| `object` | `MK_OBJECT` | `Map<string, RuntimeVal>` |
| `array` | `MK_ARRAY` | `RuntimeVal[]` elements |
| `fn` / `native-fn` | | |

- `ubwoko` returns `urutonde` for arrays and the internal type name otherwise.
- Arrays print as `[1, 2, 3]`.
- Out-of-range index raises K016.
- Method dispatch: `arr.ingano()`, `s.inyuguti_nkuru()` via `methods.ts`. Namespace forms `KIN_URUTONDE.*` / `KIN_AMAGAMBO.*` remain.

**Truthiness** (`isTruthy`): `sibyo`, `ubusa`, and `0` are false; everything else is true.

**Operators**: dispatch table by operand types; fallthrough is K012. String `+` string concatenates; string `+` number coerces the number.

---

## 8. How to add a builtin

Prefer `defineNative` from `src/runtime/native.ts`:

```ts
import { defineNative } from './native';
import { MK_NUMBER, NumberVal } from './values';

// Inside createGlobalEnv, on a namespace Map or the env itself:
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

If `globals.ts` grows past ~300 lines, split by namespace under `src/runtime/globals/`.

---

## 9. Adding Features & Contributing

1. Read this document and `grammar.bnf`.
2. Keep the code approachable: plain functions and classes over clever abstractions.
3. Add tests for every behaviour change. Bug fixes get a regression test.
4. Update `grammar.bnf` and this file when behaviour or structure changes.
5. Do not invent Kinyarwanda: leave `TODO(rw):` markers and list them in the PR.
6. Conventional commits: `fix:`, `feat:`, `refactor:`, `docs:`, `test:`.
7. Verify: `npm run lint`, `npm test`, `npm run build`, `npm run test:examples:cli`.

Published API in `src/index.ts` (Parser, Lexer, Interpreter, createGlobalEnv, Environment, MK_* helpers, value types) must keep working. `Environment.lookupOrMutObject` stays as a deprecated alias.
