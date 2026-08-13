import {
  ArrayVal,
  MK_ARRAY,
  MK_BOOL,
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
  RuntimeVal,
  StringVal,
  valuesEqual,
} from '../values';
import { defineNative } from '../native';

/** KIN_URUTONDE — array helpers (namespace form). Method form lives in methods.ts. */
export function createKinUrutonde(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'ingano',
        defineNative({
          name: 'KIN_URUTONDE.ingano',
          params: ['array'],
          fn: (args) => MK_NUMBER((args[0] as ArrayVal).elements.length),
        }),
      )
      .set(
        'ongera_kumusozo',
        defineNative({
          name: 'KIN_URUTONDE.ongera_kumusozo',
          params: ['array', 'any'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            arr.elements.push(args[1]);
            return MK_NUMBER(arr.elements.length);
          },
        }),
      )
      .set(
        'siba_kumusozo',
        defineNative({
          name: 'KIN_URUTONDE.siba_kumusozo',
          params: ['array'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            if (arr.elements.length > 0) arr.elements.pop();
            return MK_NUMBER(arr.elements.length);
          },
        }),
      )
      .set(
        'ifite_ikirango',
        defineNative({
          name: 'KIN_URUTONDE.ifite_ikirango',
          params: ['array', 'string'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            const key = (args[1] as StringVal).value;
            const idx = Number(key);
            return MK_BOOL(
              Number.isInteger(idx) && idx >= 0 && idx < arr.elements.length,
            );
          },
        }),
      )
      .set(
        'ifite',
        defineNative({
          name: 'KIN_URUTONDE.ifite',
          params: ['array', 'any'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            const needle = args[1];
            for (const el of arr.elements) {
              if (valuesEqual(el, needle)) return MK_BOOL(true);
            }
            return MK_BOOL(false);
          },
        }),
      )
      .set(
        'kora_ijambo',
        defineNative({
          name: 'KIN_URUTONDE.kora_ijambo',
          params: ['array'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            const str = arr.elements
              .map((v: RuntimeVal) => {
                if ('value' in v && v.value !== null && v.value !== undefined) {
                  return String((v as { value: unknown }).value);
                }
                return '';
              })
              .join('');
            return MK_STRING(str);
          },
        }),
      )
      .set(
        'injiza_ahabanza',
        defineNative({
          name: 'KIN_URUTONDE.injiza_ahabanza',
          params: ['array', 'any'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            return MK_ARRAY([args[1], ...arr.elements]);
          },
        }),
      )
      .set(
        'siba_ahabanza',
        defineNative({
          name: 'KIN_URUTONDE.siba_ahabanza',
          params: ['array'],
          fn: (args) => {
            const arr = args[0] as ArrayVal;
            return MK_ARRAY(arr.elements.slice(1));
          },
        }),
      ),
  );
}
