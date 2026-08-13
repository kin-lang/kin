# Kin error catalog

Stable codes used by the runtime and the CLI. Messages live in
`src/messages/en.json` and `src/messages/rw.json`. Default language is
Kinyarwanda (`KIN_LANG=rw`); set `KIN_LANG=en` for English. Missing
Kinyarwanda entries fall back to English.

Every language error is a `KinError` subclass with:

| Field | Meaning | Examples |
|-------|---------|----------|
| `code` | Stable detail code | `K005`, `K012` |
| `ERRNAME` | Category name | `SyntaxError`, `TypeError`, `ReferenceError`, `RuntimeError` |
| `ERRCODE` | Category code | `E_SYNTAX`, `E_TYPE`, `E_REFERENCE`, `E_RUNTIME` |

Subclasses: `KinSyntaxError`, `KinTypeError`, `KinReferenceError`, `KinRuntimeError`.
Host programs can branch on `instanceof`, `ERRNAME`, or `ERRCODE`.

| Code | Category | English message | Example | How to fix |
|------|----------|-----------------|---------|------------|
| K001 | SyntaxError | Unexpected token {lexeme} | `reka x = )` | Remove or replace the unexpected token. |
| K002 | SyntaxError | Expected {expected}, found {lexeme} | `niba x { }` | Add the missing token (often `(` or `{`). |
| K003 | SyntaxError | Unterminated string literal | `"muraho` | Close the string with `"`. |
| K004 | SyntaxError | Unexpected character '{char}' | `reka x = ~` | Remove the illegal character. |
| K005 | ReferenceError | Cannot resolve '{name}' as it does not exist | `tangaza_amakuru(c)` | Declare the name with `reka` first. |
| K006 | ReferenceError | Cannot reassign to variable '{name}' as it is constant | `nibyo = sibyo` | Use `reka` for a mutable binding. |
| K007 | ReferenceError | Cannot declare variable '{name}' as it is already defined | `reka x = 1 reka x = 2` | Pick a new name or assign without `reka`. |
| K008 | TypeError | Cannot access property '{key}' of {type} | `reka n = 1 n.foo` | Only objects (and method forms on strings/arrays) have properties. |
| K009 | TypeError | Cannot use {type} as an index or key | `arr[ubusa]` | Use a number or string index. |
| K010 | TypeError | Cannot call a value that is not a function | `reka x = 1 x()` | Call only functions. |
| K011 | TypeError | Wrong number of arguments | `f(1)` when `f` needs two | Pass the expected number of arguments. |
| K012 | TypeError | Operator '{op}' cannot be applied to {left} and {right} | `nibyo + 1` | Use matching types (or string + number for `+`). |
| K013 | RuntimeError | komeza can only be used inside a loop | bare `komeza` | Move `komeza` into a `subiramo_niba` body. |
| K014 | RuntimeError | hagarara can only be used inside a loop | bare `hagarara` at top level | Move `hagarara` into a loop body. |
| K015 | RuntimeError | tanga can only be used inside a function | bare `tanga 1` | Use `tanga` inside `porogaramu_ntoya`. |
| K016 | TypeError | Array index {index} is out of range (length {length}) | `[1][5]` | Check the index against `ingano`. |
| K017 | TypeError | {name} expects at least {min} argument(s) | `sisitemu()` | Pass the required arguments. |
| K018 | TypeError | {name} expects argument {arg} to be {expected} | `KIN_IMIBARE.sin("x")` | Pass a value of the right type. |
| K019 | RuntimeError | {name} cannot be used across a function boundary | `porogaramu_ntoya f(){ hagarara } f()` | Keep `hagarara`/`komeza` inside the function's own loop. |
| K020 | SyntaxError | Constant variables must be assigned a value | `ntahinduka x;` | Write `ntahinduka x = ...`. |
| K021 | SyntaxError | Dot operator requires an identifier on the right-hand side | `obj.1` | Use `obj.field` or `obj[expr]`. |
| K022 | SyntaxError | Expected identifier for function parameter | `porogaramu_ntoya f(1){}` | Parameter names must be identifiers. |
| K023 | SyntaxError | Invalid left-hand side in assignment | `1 = 2` | Assign to a variable or member. |
| K024 | TypeError | Unary operator '{op}' is not supported on {type} | `-"x"` | Use unary `-` only on numbers. |
| K025 | RuntimeError | hagarara expects 1 or 0 as exit codes | process exit API | Pass `0` or `1`. |
| K026 | RuntimeError | AST of unknown kind found | internal | Report to Kin developers. |
| K027 | RuntimeError | Cannot evaluate member expression without a member or assignment | internal | Report to Kin developers. |
| K028 | RuntimeError | Unknown operator '{op}' | internal | Report to Kin developers. |
| K029 | RuntimeError | Unhandled type in equality | internal | Report to Kin developers. |
| K030 | SyntaxError | Expected function name following porogaramu_ntoya | `porogaramu_ntoya (){}` | Name the function. |
| K031 | SyntaxError | Variable name expected following reka or ntahinduka | `reka = 1` | Write `reka name = ...`. |
| K032 | SyntaxError | Visibility-prefixed field init is only allowed inside tegura | `rusange _.x = 1` at top level | Create fields only in `tegura` with `rusange/bwite _.name = expr`. |
| K033 | SyntaxError | Class may only declare one tegura | two `tegura` in one class | Keep a single constructor. |
| K034 | SyntaxError | Unexpected token in class body: {lexeme} | bare statement in `imiterere` | Only `tegura` and visibility-prefixed methods. |
| K035 | SyntaxError | rema requires a call: rema ClassName(args) | `rema Umuntu` | Write `rema ClassName(...)`. |
| K036 | TypeError | Cannot access private member '{name}' | `obj.secret` when private | Use a public method, or access only inside the declaring class. |
| K037 | TypeError | Cannot assign to unknown field '{name}' | `_.newField = 1` in a method | Declare fields in `tegura` first. |
| K038 | TypeError | Parent '{name}' is not a class | `imiterere C ikomoka 1` | Parent must be a class value. |
| K039 | TypeError | rema expects a class, got {type} | `rema 5()` | Instantiate only class values. |
| K040 | TypeError | Duplicate method '{name}' in class | two methods named `jya` | Rename one of the methods. |
| K041 | SyntaxError | Class methods with rusange/bwite are only allowed inside imiterere | top-level `rusange porogaramu_ntoya` | Move the method into a class body. |

Messages are loaded from `src/messages/rw.json` (default) and `src/messages/en.json` (`KIN_LANG=en`).
