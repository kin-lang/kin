/***********************************************************************************************
 *                                       Runtime Values                                        *
 *              Kin's runtime values, responsible of defining Runtime values types             *
 ***********************************************************************************************/

import { Stmt } from '../parser/ast';
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
  | 'string';

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
 * Human-facing Kinyarwanda type name for `ubwoko()` and error messages.
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
      return 'porogaramu_ntoya';
    case 'native-fn':
      return '_porogaramu_ntoya';
    case 'null':
      return 'ubusa';
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
    default:
      return false;
  }
}
