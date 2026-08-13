/********************************************************************************
 *                         Variable type annotations                            *
 *   Runtime checks for optional type annotations on reka / ntahinduka          *
 ********************************************************************************/

import { TypeAnnotation } from '../parser/ast';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';
import { RuntimeVal } from './values';

/**
 * Type-safety mode for a program.
 * - `on` (default): annotated bindings are checked; unannotated stay dynamic
 * - `off`: annotations are ignored (type safety disabled)
 * - `strict`: every reka/ntahinduka must have a type annotation
 *
 * Resolution order: CLI `--types` > file `# kin-types:` directive > `KIN_TYPES` env > `on`
 */
export type TypeSafetyMode = 'on' | 'off' | 'strict';

const TYPE_SAFETY_MODES = new Set<TypeSafetyMode>(['on', 'off', 'strict']);

/** Built-in type names accepted in annotations. */
export const BUILTIN_TYPE_NAMES = [
  'number',
  'string',
  'boolean',
  'object',
  'urutonde',
  'fn',
  'native-fn',
] as const;

export type BuiltinTypeName = (typeof BUILTIN_TYPE_NAMES)[number];

const BUILTIN_SET = new Set<string>(BUILTIN_TYPE_NAMES);

/**
 * File directive: `# kin-types: on|off|strict` (case-insensitive).
 * Last matching directive in the file wins.
 */
const KIN_TYPES_DIRECTIVE = /^\s*#\s*kin-types\s*:\s*(on|off|strict)\s*$/i;

export function isBuiltinTypeName(name: string): name is BuiltinTypeName {
  return BUILTIN_SET.has(name);
}

/** Normalize a type name for checking (`native-fn` aliases to `fn`). */
export function normalizeAnnotationName(name: string): string {
  if (name === 'native-fn') return 'fn';
  return name;
}

/**
 * Map a runtime value to its annotation type name.
 * User functions and native functions both report as `fn` for annotations
 * (ubwoko still prints `fn` vs `native-fn` as the raw runtime tag).
 */
export function annotationTypeName(value: RuntimeVal): string {
  if (value.type === 'array') return 'urutonde';
  if (value.type === 'native-fn' || value.type === 'fn') return 'fn';
  if (value.type === 'null') return 'null';
  return value.type;
}

/** Whether a value satisfies the annotation (including optional null). */
export function valueMatchesType(
  value: RuntimeVal,
  annotation: TypeAnnotation,
): boolean {
  if (value.type === 'null') {
    return annotation.optional;
  }
  return annotationTypeName(value) === normalizeAnnotationName(annotation.name);
}

/** Format for display: `number` or `number?`. */
export function formatTypeAnnotation(annotation: TypeAnnotation): string {
  const name = normalizeAnnotationName(annotation.name);
  return annotation.optional ? `${name}?` : name;
}

/**
 * Throw if the value does not match the annotation.
 * Used on declaration and reassignment when type safety is not `off`.
 */
export function assertValueMatchesType(
  value: RuntimeVal,
  annotation: TypeAnnotation,
  varname: string,
  span?: Span,
): void {
  if (valueMatchesType(value, annotation)) return;

  const expectedName = normalizeAnnotationName(annotation.name);
  const got = annotationTypeName(value);

  if (value.type === 'null' && !annotation.optional) {
    throw createKinError('K034', {
      span,
      params: {
        name: varname,
        expected: expectedName,
      },
      message: `Variable '${varname}' has required type ${expectedName} and cannot be ubusa`,
    });
  }

  // K033: report the base type name; optional is a separate concern (nullability).
  throw createKinError('K033', {
    span,
    params: {
      name: varname,
      expected: expectedName,
      got,
    },
    message: `Variable '${varname}' expects type ${expectedName}, got ${got}`,
  });
}

export function normalizeTypeSafetyMode(
  raw: string | null | undefined,
): TypeSafetyMode | undefined {
  if (raw == null || raw === '') return undefined;
  const mode = raw.trim().toLowerCase() as TypeSafetyMode;
  return TYPE_SAFETY_MODES.has(mode) ? mode : undefined;
}

/** Last `# kin-types: on|off|strict` comment in the source, if any. */
export function parseTypeSafetyDirective(
  source: string,
): TypeSafetyMode | undefined {
  let found: TypeSafetyMode | undefined;
  for (const line of source.split(/\r?\n/)) {
    const m = line.match(KIN_TYPES_DIRECTIVE);
    if (m) {
      found = m[1].toLowerCase() as TypeSafetyMode;
    }
  }
  return found;
}

/**
 * Resolve effective type-safety mode.
 * Precedence: explicit override > file `# kin-types:` > `KIN_TYPES` env > `on`.
 */
export function resolveTypeSafetyMode(
  source: string,
  override?: string | null,
): TypeSafetyMode {
  const fromOverride = normalizeTypeSafetyMode(override ?? undefined);
  if (fromOverride) return fromOverride;

  const fromFile = parseTypeSafetyDirective(source);
  if (fromFile) return fromFile;

  const fromEnv = normalizeTypeSafetyMode(process.env.KIN_TYPES);
  if (fromEnv) return fromEnv;

  return 'on';
}
