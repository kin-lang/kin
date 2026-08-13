/***********************************************************************************************
 *                                       Runtime Values                                        *
 *              Kin's runtime values, responsible of defining Runtime values types             *
 ***********************************************************************************************/

import { Stmt, Visibility } from '../parser/ast';
import Environment from './environment';
import type { ResolvedType } from './types';

export type ValueType =
  | 'null'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'native-fn'
  | 'fn'
  | 'string'
  | 'class'
  | 'instance'
  | 'type-val'
  | 'bound-method';

export interface RuntimeVal {
  type: ValueType;
}

export interface NullVal extends RuntimeVal {
  type: 'null';
  value: null;
}

export interface BooleanVal extends RuntimeVal {
  type: 'boolean';
  value: boolean;
}

export interface NumberVal extends RuntimeVal {
  type: 'number';
  value: number;
}

export interface StringVal extends RuntimeVal {
  type: 'string';
  value: string;
}

export interface ObjectVal extends RuntimeVal {
  type: 'object';
  properties: Map<string, RuntimeVal>;
}

/** Contiguous list of values. Replaces the old object-with-string-keys arrays. */
export interface ArrayVal extends RuntimeVal {
  type: 'array';
  elements: RuntimeVal[];
}

export interface FunctionValue extends RuntimeVal {
  type: 'fn';
  name: string;
  parameters: string[];
  /** Resolved parameter types (aligned with parameters; undefined = untyped). */
  parameterTypes?: (ResolvedType | undefined)[];
  /** Resolved return type when annotated. */
  returnType?: ResolvedType;
  declarationEnv: Environment;
  body: Stmt[];
}

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;

export interface NativeFnValue extends RuntimeVal {
  type: 'native-fn';
  call: FunctionCall;
}

/** Method definition stored on a class (not a first-class value by itself). */
export interface ClassMethodDef {
  visibility: Visibility;
  name: string;
  parameters: string[];
  parameterTypes?: (ResolvedType | undefined)[];
  returnType?: ResolvedType;
  body: Stmt[];
  /** Class that declared this method (for private access). */
  ownerClass: ClassVal;
}

/**
 * Class value bound by `imiterere Name { … }`.
 * First-class: can be passed around and used with `rema`.
 */
export interface ClassVal extends RuntimeVal {
  type: 'class';
  name: string;
  parent?: ClassVal;
  hasConstructor: boolean;
  constructorParams: string[];
  constructorParamTypes?: (ResolvedType | undefined)[];
  constructorBody: Stmt[];
  methods: Map<string, ClassMethodDef>;
  declarationEnv: Environment;
}

export interface InstanceVal extends RuntimeVal {
  type: 'instance';
  klass: ClassVal;
  fields: Map<string, RuntimeVal>;
  fieldVisibility: Map<string, Visibility>;
  /** Which class introduced each field (private checks). */
  fieldOwner: Map<string, ClassVal>;
}

/**
 * Built-in type tag used by the `ubwoko` operator for identity comparisons.
 * e.g. ubwoko(5) == ubwoko(10)  (same TypeVal singleton).
 * For instances, ubwoko returns the ClassVal itself instead.
 */
export interface TypeVal extends RuntimeVal {
  type: 'type-val';
  name: string;
}

/** Method closed over its receiver: `reka f = keza.kwibwira; f()`. */
export interface BoundMethodVal extends RuntimeVal {
  type: 'bound-method';
  receiver: InstanceVal;
  method: ClassMethodDef;
}

// ---------------------------------------------------------------------------
// Built-in type-value singletons (identity equality for ubwoko)
// ---------------------------------------------------------------------------

export const TYPE_UMUBARE: TypeVal = { type: 'type-val', name: 'umubare' };
export const TYPE_IJAMBO: TypeVal = { type: 'type-val', name: 'ijambo' };
export const TYPE_UKURI: TypeVal = { type: 'type-val', name: 'ukuri' };
export const TYPE_UBUSA: TypeVal = { type: 'type-val', name: 'ubusa' };
export const TYPE_URUTONDE: TypeVal = { type: 'type-val', name: 'urutonde' };
export const TYPE_UBWOKO_IMITERERE: TypeVal = {
  type: 'type-val',
  name: 'ubwoko_imiterere',
};
/** Shared by user functions and native functions for ubwoko identity. */
export const TYPE_POROGARAMU_NTOYA: TypeVal = {
  type: 'type-val',
  name: 'porogaramu_ntoya',
};
/** Shared by all class values: ubwoko Umuntu == ubwoko Umwarimu. */
export const TYPE_IMITERERE: TypeVal = {
  type: 'type-val',
  name: 'imiterere',
};

export function MK_NATIVE_FN(call: FunctionCall) {
  return { type: 'native-fn', call } as NativeFnValue;
}

export function MK_NUMBER(n = 0) {
  return { type: 'number', value: n } as NumberVal;
}

export function MK_NULL() {
  return { type: 'null', value: null } as NullVal;
}

export function MK_BOOL(b = true) {
  return { type: 'boolean', value: b } as BooleanVal;
}

export function MK_STRING(val: string) {
  return { type: 'string', value: val } as StringVal;
}

export function MK_OBJECT(obj: Map<string, RuntimeVal>) {
  return { type: 'object', properties: obj } as ObjectVal;
}

export function MK_ARRAY(elements: RuntimeVal[] = []) {
  return { type: 'array', elements } as ArrayVal;
}

/**
 * Type value returned by the `ubwoko` operator (not a string).
 * Instances return their ClassVal; classes return TYPE_IMITERERE.
 */
export function ubwokoOf(value: RuntimeVal): RuntimeVal {
  switch (value.type) {
    case 'number':
      return TYPE_UMUBARE;
    case 'string':
      return TYPE_IJAMBO;
    case 'boolean':
      return TYPE_UKURI;
    case 'null':
      return TYPE_UBUSA;
    case 'array':
      return TYPE_URUTONDE;
    case 'object':
      return TYPE_UBWOKO_IMITERERE;
    case 'fn':
    case 'native-fn':
    case 'bound-method':
      return TYPE_POROGARAMU_NTOYA;
    case 'class':
      return TYPE_IMITERERE;
    case 'instance':
      return (value as InstanceVal).klass;
    case 'type-val':
      return value;
    default:
      return TYPE_UBUSA;
  }
}

/**
 * Human-facing Kinyarwanda type name for error messages and printing.
 */
export function typeName(value: RuntimeVal): string {
  switch (value.type) {
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
    case 'bound-method':
      return 'porogaramu_ntoya';
    case 'native-fn':
      return '_porogaramu_ntoya';
    case 'null':
      return 'ubusa';
    case 'class':
      return 'imiterere';
    case 'instance':
      return (value as InstanceVal).klass.name;
    case 'type-val':
      return (value as TypeVal).name;
    default:
      return value.type;
  }
}

/** Deep-ish structural equality used by == / != and array.contains. */
export function valuesEqual(a: RuntimeVal, b: RuntimeVal): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'null':
      return true;
    case 'number':
      return (a as NumberVal).value === (b as NumberVal).value;
    case 'boolean':
      return (a as BooleanVal).value === (b as BooleanVal).value;
    case 'string':
      return (a as StringVal).value === (b as StringVal).value;
    case 'array': {
      const aa = a as ArrayVal;
      const bb = b as ArrayVal;
      if (aa.elements.length !== bb.elements.length) return false;
      for (let i = 0; i < aa.elements.length; i++) {
        if (!valuesEqual(aa.elements[i], bb.elements[i])) return false;
      }
      return true;
    }
    case 'object':
      return (a as ObjectVal).properties === (b as ObjectVal).properties;
    case 'fn':
      return (a as FunctionValue).body === (b as FunctionValue).body;
    case 'native-fn':
      return (a as NativeFnValue).call === (b as NativeFnValue).call;
    case 'class':
    case 'instance':
    case 'type-val':
    case 'bound-method':
      // Identity equality (reference).
      return a === b;
    default:
      return false;
  }
}

