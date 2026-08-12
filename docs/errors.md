# Kin error catalog

Stable codes used by the runtime and the CLI. Messages live in
`src/messages/en.json` and `src/messages/rw.json`. Default language is
Kinyarwanda (`KIN_LANG=rw`); set `KIN_LANG=en` for English. Missing
Kinyarwanda entries fall back to English.

| Code | English message | Example | How to fix |
|------|-----------------|---------|------------|
| K001 | Unexpected token {lexeme} | `reka x = )` | Remove or replace the unexpected token. |
| K002 | Expected {expected}, found {lexeme} | `niba x { }` | Add the missing token (often `(` or `{`). |
| K003 | Unterminated string literal | `"muraho` | Close the string with `"`. |
| K004 | Unexpected character '{char}' | `reka x = ~` | Remove the illegal character. |
| K005 | Cannot resolve '{name}' as it does not exist | `tangaza_amakuru(c)` | Declare the name with `reka` first. |
| K006 | Cannot reassign to variable '{name}' as it is constant | `nibyo = sibyo` | Use `reka` for a mutable binding. |
| K007 | Cannot declare variable '{name}' as it is already defined | `reka x = 1 reka x = 2` | Pick a new name or assign without `reka`. |
| K008 | Cannot access property '{key}' of {type} | `reka n = 1 n.foo` | Only objects (and method forms on strings/arrays) have properties. |
| K009 | Cannot use {type} as an index or key | `arr[ubusa]` | Use a number or string index. |
| K010 | Cannot call a value that is not a function | `reka x = 1 x()` | Call only functions. |
| K011 | Wrong number of arguments | `f(1)` when `f` needs two | Pass the expected number of arguments. |
| K012 | Operator '{op}' cannot be applied to {left} and {right} | `nibyo + 1` | Use matching types (or string + number for `+`). |
| K013 | komeza can only be used inside a loop | bare `komeza` | Move `komeza` into a `subiramo_niba` body. |
| K014 | hagarara can only be used inside a loop | bare `hagarara` at top level | Move `hagarara` into a loop body. |
| K015 | tanga can only be used inside a function | bare `tanga 1` | Use `tanga` inside `porogaramu_ntoya`. |
| K016 | Array index {index} is out of range (length {length}) | `[1][5]` | Check the index against `ingano`. |
| K017 | {name} expects at least {min} argument(s) | `sisitemu()` | Pass the required arguments. |
| K018 | {name} expects argument {arg} to be {expected} | `KIN_IMIBARE.sin("x")` | Pass a value of the right type. |
| K019 | {name} cannot be used across a function boundary | `porogaramu_ntoya f(){ hagarara } f()` | Keep `hagarara`/`komeza` inside the function's own loop. |
| K020 | Constant variables must be assigned a value | `ntahinduka x;` | Write `ntahinduka x = ...`. |
| K021 | Dot operator requires an identifier on the right-hand side | `obj.1` | Use `obj.field` or `obj[expr]`. |
| K022 | Expected identifier for function parameter | `porogaramu_ntoya f(1){}` | Parameter names must be identifiers. |
| K023 | Invalid left-hand side in assignment | `1 = 2` | Assign to a variable or member. |
| K024 | Unary operator '{op}' is not supported on {type} | `-"x"` | Use unary `-` only on numbers. |
| K025 | hagarara expects 1 or 0 as exit codes | process exit API | Pass `0` or `1`. |
| K026 | AST of unknown kind found | internal | Report to Kin developers. |
| K027 | Cannot evaluate member expression without a member or assignment | internal | Report to Kin developers. |
| K028 | Unknown operator '{op}' | internal | Report to Kin developers. |
| K029 | Unhandled type in equality | internal | Report to Kin developers. |
| K030 | Expected function name following porogaramu_ntoya | `porogaramu_ntoya (){}` | Name the function. |
| K031 | Variable name expected following reka or ntahinduka | `reka = 1` | Write `reka name = ...`. |

Messages are loaded from `src/messages/rw.json` (default) and `src/messages/en.json` (`KIN_LANG=en`).
