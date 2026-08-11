import { LogError } from '../../lib/log';
import {
  MK_NATIVE_FN,
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from '../values';

export function createKinAmagambo(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'huza', // joining 2 string
        MK_NATIVE_FN((args) => {
          let res = '';

          for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res += arg.value;
          }

          return MK_STRING(res);
        }),
      )
      .set(
        'ingano',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_AMAGAMBO.ingano expects at least one argument');
          const str = (args[0] as StringVal).value;
          if (typeof str != 'string')
            LogError('KIN_AMAGAMBO.ingano expects string as an argument');
          return MK_NUMBER(str.length);
        }),
      )
      .set(
        'inyuguti',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_AMAGAMBO.inyuguti expects at least two argument');
          const str = (args[0] as StringVal).value;
          const charIndex = (args[1] as NumberVal).value;
          if (typeof str != 'string')
            LogError(
              'first argument of KIN_AMABAMBO.inyuguti must be a string',
            );
          else if (typeof charIndex != 'number')
            LogError(
              'second argument of KIN_AMABAMBO.inyuguti must be a number',
            );
          return MK_STRING(str.charAt(charIndex));
        }),
      )
      .set(
        'inyuguti_nkuru',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_AMAGAMBO.inyuguti_nkuru expects at least one argument',
            );
          const str = (args[0] as StringVal).value;
          if (typeof str != 'string')
            LogError(
              'KIN_AMAGAMBO.inyuguti_nkuru expect a string as an argument',
            );
          return MK_STRING(str.toUpperCase());
        }),
      )
      .set(
        'inyuguti_ntoya',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_AMAGAMBO.inyuguti_ntoya expects at least one argument',
            );
          const str = (args[0] as StringVal).value;
          if (typeof str != 'string')
            LogError(
              'KIN_AMAGAMBO.inyuguti_ntoya expect a string as an argument',
            );
          return MK_STRING(str.toLowerCase());
        }),
      )
      .set(
        'tandukanya', // splitting a string
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_AMAGAMBO.tangukanya expects at least two argument');
          const str = (args[0] as StringVal).value;
          const separator = (args[1] as StringVal).value;
          if (typeof str != 'string' || typeof separator != 'string')
            LogError(
              'KIN_AMAGAMBO.tandukanya expects 2 arguments to be strings',
            );
          const arr = new Map<string, RuntimeVal>();
          str.split(separator).map((s, i) => {
            // s for string and i for index
            arr.set(i.toString(), MK_STRING(s));
          });
          return MK_OBJECT(arr);
        }),
      ),
  );
}
