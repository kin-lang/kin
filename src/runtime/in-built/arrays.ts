import { LogError } from '../../lib/log';
import {
  MK_BOOL,
  MK_NATIVE_FN,
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from '../values';

export function createKinUrutonde(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'ingano',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_URUTONDE.ingano expects at least one argument');
          const obj = args[0] as ObjectVal;
          if (typeof obj != 'object')
            LogError('KIN_URUTONDE.ingano expects argument to be an array');
          return MK_NUMBER(obj.properties.size);
        }),
      )
      .set(
        'ongera_kumusozo',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_URUTONDE.ongera_kumusozo expects at least two arguments',
            );
          const obj = args[0] as ObjectVal;
          const val = args[1];
          if (typeof obj != 'object')
            LogError(
              'KIN_URUTONDE.ongera_kumusozo expects first argument to be an array',
            );
          const key = obj.properties.size; // get the size of the map
          obj.properties.set(key.toString(), val);
          return MK_NUMBER(obj.properties.size); // return the new size of arr.
        }),
      )
      .set(
        'siba_kumusozo',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_URUTONDE.siba_kumusozo expects at least one argument',
            );
          const obj = args[0] as ObjectVal;
          if (typeof obj != 'object')
            LogError(
              'KIN_URUTONDE.siba_kumusozo expects an argument to be an array',
            );
          obj.properties.delete((obj.properties.size - 1).toString()); // remove the last element
          return MK_NUMBER(obj.properties.size); // return the new size of arr.
        }),
      )
      .set(
        'ifite_ikirango',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_URUTONDE.ifite_ikirango expects at least two arguments',
            );
          const arr = args[0] as ObjectVal;
          const val = args[1] as StringVal;

          return MK_BOOL(arr.properties.has(val.value));
        }),
      )
      .set(
        'ifite',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_URUTONDE.ifite expects at least two arguments');
          const obj = args[0] as ObjectVal; // map with <key, value>
          const arr = obj.properties.values(); // only map's values
          const val = args[1] as StringVal; // value to check
          const nextVal = arr.next()?.value as RuntimeVal | undefined;
          return MK_BOOL(
            nextVal !== undefined &&
              'value' in nextVal &&
              nextVal.value === val.value,
          );
        }),
      )
      .set(
        'kora_ijambo',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_URUTONDE.kora_ijambo expects at least one argument');
          const obj = args[0] as ObjectVal; // map with <key, value>
          const str = Array.from(obj.properties.values())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((v: any) => v?.value)
            .join('');
          return MK_STRING(str);
        }),
      )
      .set(
        'injiza_ahabanza',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_URUTONDE.injiza_ahabanza expects at least two arguments',
            );
          const obj = args[0] as ObjectVal;
          if (typeof obj != 'object')
            LogError(
              'KIN_URUTONDE.injiza_ahabanza expects an argument to be an array',
            );
          const val = args[1] as RuntimeVal;

          // New array with new value
          const newArr: ObjectVal = { type: 'object', properties: new Map() };

          // Setting values accordingly && Shift existing elements' keys by 1
          newArr.properties.set('0', val);

          for (const [key, value] of obj.properties) {
            newArr.properties.set((parseInt(key) + 1).toString(), value);
          }

          return newArr;
        }),
      )
      .set(
        'siba_ahabanza',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_URUTONDE.siba_ahabanza expects at least one argument',
            );
          const obj = args[0] as ObjectVal;
          if (typeof obj != 'object')
            LogError(
              'KIN_URUTONDE.siba_ahabanza expects an argument to be an array',
            );

          // New array with removed value
          const newArr: ObjectVal = { type: 'object', properties: new Map() };

          // Skip the first element
          for (const [key, value] of obj.properties) {
            if (parseInt(key) !== 0) {
              newArr.properties.set((parseInt(key) - 1).toString(), value);
            }
          }

          return newArr;
        }),
      ),
  );
}
