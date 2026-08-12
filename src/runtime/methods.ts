/****************************************
 *          Method dispatch             *
 *   Per-type methods for arr.ingano()  *
 *   and izina.inyuguti_nkuru() forms   *
 ****************************************/

import {
  ArrayVal,
  MK_ARRAY,
  MK_BOOL,
  MK_NUMBER,
  MK_STRING,
  NumberVal,
  RuntimeVal,
  StringVal,
  valuesEqual,
} from './values';
import { KinError } from '../lib/errors';
import { Span } from '../lib/span';

type MethodFn = (
  receiver: RuntimeVal,
  args: RuntimeVal[],
  span?: Span,
) => RuntimeVal;

const stringMethods: Record<string, MethodFn> = {
  ingano: (receiver) => MK_NUMBER((receiver as StringVal).value.length),
  inyuguti_nkuru: (receiver) =>
    MK_STRING((receiver as StringVal).value.toUpperCase()),
  inyuguti_ntoya: (receiver) =>
    MK_STRING((receiver as StringVal).value.toLowerCase()),
  inyuguti: (receiver, args) => {
    if (args.length < 1 || args[0].type !== 'number') {
      throw new KinError('K018', {
        message: 'inyuguti expects a number index',
        params: {
          name: 'inyuguti',
          arg: 1,
          expected: 'number',
          got: args[0]?.type ?? 'none',
        },
      });
    }
    const idx = (args[0] as NumberVal).value;
    return MK_STRING((receiver as StringVal).value.charAt(idx));
  },
};

const arrayMethods: Record<string, MethodFn> = {
  ingano: (receiver) => MK_NUMBER((receiver as ArrayVal).elements.length),
  ongera_kumusozo: (receiver, args) => {
    if (args.length < 1) {
      throw new KinError('K017', {
        message: 'ongera_kumusozo expects at least one argument',
        params: { name: 'ongera_kumusozo', min: 1 },
      });
    }
    const arr = receiver as ArrayVal;
    arr.elements.push(args[0]);
    return MK_NUMBER(arr.elements.length);
  },
  siba_kumusozo: (receiver) => {
    const arr = receiver as ArrayVal;
    if (arr.elements.length > 0) arr.elements.pop();
    return MK_NUMBER(arr.elements.length);
  },
  ifite: (receiver, args) => {
    if (args.length < 1) {
      throw new KinError('K017', {
        message: 'ifite expects at least one argument',
        params: { name: 'ifite', min: 1 },
      });
    }
    const arr = receiver as ArrayVal;
    const needle = args[0];
    for (const el of arr.elements) {
      if (valuesEqual(el, needle)) return MK_BOOL(true);
    }
    return MK_BOOL(false);
  },
  ifite_ikirango: (receiver, args) => {
    if (args.length < 1 || args[0].type !== 'string') {
      throw new KinError('K018', {
        message: 'ifite_ikirango expects a string key',
        params: {
          name: 'ifite_ikirango',
          arg: 1,
          expected: 'string',
          got: args[0]?.type ?? 'none',
        },
      });
    }
    const key = (args[0] as StringVal).value;
    const idx = Number(key);
    const arr = receiver as ArrayVal;
    return MK_BOOL(
      Number.isInteger(idx) && idx >= 0 && idx < arr.elements.length,
    );
  },
  kora_ijambo: (receiver) => {
    const arr = receiver as ArrayVal;
    const str = arr.elements
      .map((v) => {
        if ('value' in v && v.value !== null && v.value !== undefined) {
          return String((v as { value: unknown }).value);
        }
        return '';
      })
      .join('');
    return MK_STRING(str);
  },
  injiza_ahabanza: (receiver, args) => {
    if (args.length < 1) {
      throw new KinError('K017', {
        message: 'injiza_ahabanza expects at least one argument',
        params: { name: 'injiza_ahabanza', min: 1 },
      });
    }
    const arr = receiver as ArrayVal;
    return MK_ARRAY([args[0], ...arr.elements]);
  },
  siba_ahabanza: (receiver) => {
    const arr = receiver as ArrayVal;
    return MK_ARRAY(arr.elements.slice(1));
  },
};

/**
 * Look up a method on a non-object receiver (string / array).
 * Returns undefined when the type has no such method.
 */
export function lookupMethod(
  receiver: RuntimeVal,
  name: string,
): MethodFn | undefined {
  if (receiver.type === 'string') return stringMethods[name];
  if (receiver.type === 'array') return arrayMethods[name];
  return undefined;
}
