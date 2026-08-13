/***********************************************************************************************
 *                                       Runtime Values                                        *
 *              Kin's runtime values, responsible of defining Runtime values types             *
 ***********************************************************************************************/

import { Stmt, Visibility } from '../parser/ast';
import Environment from './environment';

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
  | 'bound-method'
  | 'type';

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
  declarationEnv: Environment;
  body: Stmt[];
}

/**
 * Built-in type tag returned by `ubwoko` for non-instance values.
 * Singletons are shared so `ubwoko 5 == ubwoko 10` is identity-true.
 */
export interface TypeVal extends RuntimeVal {
  type: 'type';
  /** Display / compare name: number, string, fn, urutonde, class, ... */
  name: string;
}

/** Method stored on a ClassVal. */
export interface ClassMethodValue {
  visibility: Visibility;
  name: string;
  parameters: string[];
  body: Stmt[];
  /** Class that declared this method (for bwite access checks). */
  declaringClass: ClassVal;
}

export interface ClassConstructorValue {
  parameters: string[];
  body: Stmt[];
  declaringClass: ClassVal;
}

/**
 * First-class class value created by `imiterere`.
 * Parent is set for `ikomoka` inheritance.
 */
export interface ClassVal extends RuntimeVal {
  type: 'class';
  name: string;
  parent?: ClassVal;
  constructorDef?: ClassConstructorValue;
  /** Methods declared on this class only (not inherited). */
  methods: Map<string, ClassMethodValue>;
  declarationEnv: Environment;
}

/** Field metadata fixed when the field is first assigned in tegura. */
export interface InstanceField {
  value: RuntimeVal;
  visibility: Visibility;
  /** Class whose tegura created the field. */
  owner: ClassVal;
}

/**
 * Instance created by `rema Class(...)`.
 * Fields exist only after visibility-prefixed assignments in tegura.
 */
export interface InstanceVal extends RuntimeVal {
  type: 'instance';
  classOf: ClassVal;
  fields: Map<string, InstanceField>;
}

/**
 * Method accessed via instance.method — retains the receiver so a later
 * call still binds `_` correctly.
 */
export interface BoundMethodVal extends RuntimeVal {
  type: 'bound-method';
  instance: InstanceVal;
  method: ClassMethodValue;
}

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;

export interface NativeFnValue extends RuntimeVal {
  type: 'native-fn';
  call: FunctionCall;
}

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

// Singleton type values so ubwoko comparisons are identity-based.
export const TYPE_NULL: TypeVal = { type: 'type', name: 'null' };
export const TYPE_NUMBER: TypeVal = { type: 'type', name: 'number' };
export const TYPE_BOOLEAN: TypeVal = { type: 'type', name: 'boolean' };
export const TYPE_STRING: TypeVal = { type: 'type', name: 'string' };
export const TYPE_OBJECT: TypeVal = { type: 'type', name: 'object' };
export const TYPE_ARRAY: TypeVal = { type: 'type', name: 'urutonde' };
export const TYPE_FN: TypeVal = { type: 'type', name: 'fn' };
export const TYPE_NATIVE_FN: TypeVal = { type: 'type', name: 'fn' };
export const TYPE_CLASS: TypeVal = { type: 'type', name: 'class' };
export const TYPE_TYPE: TypeVal = { type: 'type', name: 'type' };

/**
 * Human-facing type name for error messages and legacy string display.
 * Arrays report as "urutonde"; class instances report the class name.
 */
export function typeName(value: RuntimeVal): string {
  switch (value.type) {
    case 'array':
      return 'urutonde';
    case 'instance':
      return (value as InstanceVal).classOf.name;
    case 'class':
      return 'class';
    case 'bound-method':
      return 'fn';
    case 'type':
      return (value as TypeVal).name;
    case 'native-fn':
      return 'fn';
    default:
      return value.type;
  }
}

/**
 * Value of `ubwoko x`:
 * - instance → its ClassVal (exact class, no ancestor walk)
 * - everything else → singleton TypeVal for that kind
 */
export function typeOfValue(value: RuntimeVal): RuntimeVal {
  switch (value.type) {
    case 'null':
      return TYPE_NULL;
    case 'number':
      return TYPE_NUMBER;
    case 'boolean':
      return TYPE_BOOLEAN;
    case 'string':
      return TYPE_STRING;
    case 'object':
      return TYPE_OBJECT;
    case 'array':
      return TYPE_ARRAY;
    case 'fn':
    case 'bound-method':
      return TYPE_FN;
    case 'native-fn':
      // User functions and builtins share one function type value.
      return TYPE_FN;
    case 'class':
      return TYPE_CLASS;
    case 'instance':
      return (value as InstanceVal).classOf;
    case 'type':
      return TYPE_TYPE;
    default:
      return TYPE_NULL;
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
    case 'type':
      // Singletons: same reference, or same name if somehow duplicated.
      return a === b || (a as TypeVal).name === (b as TypeVal).name;
    case 'class':
      return a === b;
    case 'instance':
      return a === b;
    case 'bound-method': {
      const ba = a as BoundMethodVal;
      const bb = b as BoundMethodVal;
      return ba.instance === bb.instance && ba.method === bb.method;
    }
    default:
      return false;
  }
}

/** Walk parent chain to find the nearest tegura (own or inherited). */
export function resolveConstructor(
  klass: ClassVal,
): ClassConstructorValue | undefined {
  let current: ClassVal | undefined = klass;
  while (current) {
    if (current.constructorDef) return current.constructorDef;
    current = current.parent;
  }
  return undefined;
}

/** Method lookup: start on klass, walk parents upward. */
export function resolveMethod(
  klass: ClassVal,
  name: string,
): ClassMethodValue | undefined {
  let current: ClassVal | undefined = klass;
  while (current) {
    const m = current.methods.get(name);
    if (m) return m;
    current = current.parent;
  }
  return undefined;
}
