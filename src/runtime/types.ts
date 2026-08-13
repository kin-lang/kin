/***********************************************************************
 *                         Runtime type system                         *
 *  Resolve AST type nodes, check values, format human-facing names.   *
 *  Types are NOT erased: they travel lexer → parser → here at runtime.*
 ***********************************************************************/

import {
  NamedType,
  ObjectType,
  PickType,
  TypeAnnotation,
  TypeNode,
  UnionType,
} from '../parser/ast';
import { createKinError } from '../lib/errors';
import { Span } from '../lib/span';
import {
  ArrayVal,
  ClassVal,
  InstanceVal,
  ObjectVal,
  RuntimeVal,
  typeName as runtimeValueTypeName,
} from './values';
import type Environment from './environment';

/**
 * Built-in annotation names (Kinyarwanda).
 * Internal resolved names stay short English tags for comparisons.
 */
const PRIMITIVE_NAMES = new Set([
  'umubare', // number
  'ijambo', // string
  'ukuri', // boolean
  'ubwoko_imiterere', // plain object
  'urutonde', // array
  'porogaramu_ntoya', // function (user or native)
  '_porogaramu_ntoya', // native-fn synonym
  'ubusa', // null
]);

/**
 * Fully resolved type used for runtime checks.
 * Named aliases are expanded before storage.
 */
export type ResolvedType =
  | { kind: 'primitive'; name: string }
  | { kind: 'object'; properties: Map<string, ResolvedType> }
  | { kind: 'union'; members: ResolvedType[] }
  /** Exact class instance type (no inheritance widening). */
  | { kind: 'class'; className: string; classRef: ClassVal };

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a TypeAnnotation into a ResolvedType.
 * Optional annotations (`T?`) become `T | null`.
 */
export function resolveAnnotation(
  annotation: TypeAnnotation,
  env: Environment,
): ResolvedType {
  const base = resolveTypeNode(annotation.type, env);
  if (!annotation.optional) return base;
  return {
    kind: 'union',
    members: [base, { kind: 'primitive', name: 'null' }],
  };
}

export function resolveTypeNode(node: TypeNode, env: Environment): ResolvedType {
  switch (node.kind) {
    case 'NamedType':
      return resolveNamedType(node, env);
    case 'ObjectType':
      return resolveObjectType(node, env);
    case 'UnionType':
      return resolveUnionType(node, env);
    case 'PickType':
      return resolvePickType(node, env);
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

function resolveNamedType(node: NamedType, env: Environment): ResolvedType {
  const name = node.name;

  // Built-in primitives (Kinyarwanda surface → internal tag)
  switch (name) {
    case 'umubare':
      return { kind: 'primitive', name: 'number' };
    case 'ijambo':
      return { kind: 'primitive', name: 'string' };
    case 'ukuri':
      return { kind: 'primitive', name: 'boolean' };
    case 'ubwoko_imiterere':
      return { kind: 'primitive', name: 'object' };
    case 'urutonde':
      return { kind: 'primitive', name: 'array' };
    case 'porogaramu_ntoya':
    case '_porogaramu_ntoya':
      // Both user and native functions match porogaramu_ntoya.
      return { kind: 'primitive', name: 'fn' };
    case 'ubusa':
      return { kind: 'primitive', name: 'null' };
    default:
      break;
  }

  // User-defined type alias
  const alias = env.lookupType(name);
  if (alias) return alias;

  // Class name used as a type (exact instance match).
  const klass = env.lookupClass(name);
  if (klass) {
    return { kind: 'class', className: klass.name, classRef: klass };
  }

  throw createKinError('K033', {
    span: node.span,
    params: { name },
    message: `Unknown type '${name}'`,
  });
}

function resolveObjectType(node: ObjectType, env: Environment): ResolvedType {
  const properties = new Map<string, ResolvedType>();
  for (const prop of node.properties) {
    if (properties.has(prop.key)) {
      throw createKinError('K036', {
        span: prop.span,
        params: { name: prop.key },
        message: `Duplicate property '${prop.key}' in object type`,
      });
    }
    properties.set(prop.key, resolveTypeNode(prop.type, env));
  }
  return { kind: 'object', properties };
}

function resolveUnionType(node: UnionType, env: Environment): ResolvedType {
  const members = node.members.map((m) => resolveTypeNode(m, env));
  // Flatten nested unions
  const flat: ResolvedType[] = [];
  for (const m of members) {
    if (m.kind === 'union') flat.push(...m.members);
    else flat.push(m);
  }
  return { kind: 'union', members: flat };
}

function resolvePickType(node: PickType, env: Environment): ResolvedType {
  const target = resolveTypeNode(node.target, env);
  if (target.kind !== 'object') {
    const detail = `Fata requires an object type (ubwoko_imiterere), got ${formatResolvedType(target)}`;
    throw createKinError('K034', {
      span: node.span,
      params: { message: detail },
      message: detail,
    });
  }

  const properties = new Map<string, ResolvedType>();
  for (const key of node.keys) {
    const propType = target.properties.get(key);
    if (!propType) {
      const detail = `Fata key '${key}' does not exist on type ${formatResolvedType(target)}`;
      throw createKinError('K034', {
        span: node.span,
        params: { message: detail },
        message: detail,
      });
    }
    properties.set(key, propType);
  }
  return { kind: 'object', properties };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/**
 * Whether a runtime value satisfies a resolved type (structural for objects).
 */
export function valueMatchesType(
  value: RuntimeVal,
  expected: ResolvedType,
): boolean {
  if (expected.kind === 'union') {
    return expected.members.some((m) => valueMatchesType(value, m));
  }

  if (expected.kind === 'primitive') {
    return valueMatchesPrimitive(value, expected.name);
  }

  if (expected.kind === 'class') {
    // Exact class match only — inheritance does not widen (see types-and-ubwoko).
    return (
      value.type === 'instance' &&
      (value as InstanceVal).klass === expected.classRef
    );
  }

  // Object type — structural: value must be object and every required
  // property must match. Extra properties are allowed (open structural).
  // Class instances are NOT plain objects.
  if (value.type !== 'object') return false;
  const obj = value as ObjectVal;
  for (const [key, propType] of expected.properties) {
    const propVal = obj.properties.get(key);
    if (propVal === undefined) return false;
    if (!valueMatchesType(propVal, propType)) return false;
  }
  return true;
}

function valueMatchesPrimitive(value: RuntimeVal, name: string): boolean {
  switch (name) {
    case 'number':
      return value.type === 'number';
    case 'string':
      return value.type === 'string';
    case 'boolean':
      return value.type === 'boolean';
    case 'null':
      return value.type === 'null';
    case 'array':
      return value.type === 'array';
    case 'fn':
      // User functions and native functions both count as fn.
      return value.type === 'fn' || value.type === 'native-fn';
    case 'object':
      // Bare `object` accepts any object (not arrays).
      return value.type === 'object';
    default:
      return false;
  }
}

/**
 * Human-facing Kinyarwanda name for a runtime value's type (error messages).
 */
export function valueTypeLabel(value: RuntimeVal): string {
  return runtimeValueTypeName(value);
}

/**
 * Human-facing Kinyarwanda name for a resolved type (error messages).
 */
export function formatResolvedType(type: ResolvedType): string {
  switch (type.kind) {
    case 'primitive':
      return primitiveSurfaceName(type.name);
    case 'union':
      return type.members.map(formatResolvedType).join(' | ');
    case 'class':
      return type.className;
    case 'object': {
      const parts: string[] = [];
      for (const [key, propType] of type.properties) {
        parts.push(`${key}: ${formatResolvedType(propType)}`);
      }
      return `{ ${parts.join(', ')} }`;
    }
  }
}

/** Map internal tags → Kinyarwanda surface names. */
function primitiveSurfaceName(internal: string): string {
  switch (internal) {
    case 'number':
      return 'umubare';
    case 'string':
      return 'ijambo';
    case 'boolean':
      return 'ukuri';
    case 'object':
      return 'ubwoko_imiterere';
    case 'array':
      return 'urutonde';
    case 'fn':
      return 'porogaramu_ntoya';
    case 'null':
      return 'ubusa';
    default:
      return internal;
  }
}

/**
 * Throw a clear assignment type-mismatch error.
 * Message shape (user-requested):
 *   Cannot assign a number to a string, expected a string instead.
 */
export function assertValueMatchesType(
  value: RuntimeVal,
  expected: ResolvedType,
  span?: Span,
): void {
  if (valueMatchesType(value, expected)) return;

  const got = valueTypeLabel(value);
  const want = formatResolvedType(expected);
  throw createKinError('K035', {
    span,
    params: { got, expected: want },
    message: `Cannot assign a ${got} to a ${want}, expected a ${want} instead.`,
  });
}

/**
 * Check that an array's elements are all of a homogeneous primitive when
 * the annotation is just `urutonde` — no element-level check (open array).
 * Kept as a named helper for future element types.
 */
export function isArrayValue(value: RuntimeVal): value is ArrayVal {
  return value.type === 'array';
}

export function isBuiltinTypeName(name: string): boolean {
  return PRIMITIVE_NAMES.has(name);
}
