import { LogError } from '../../lib/log';
import {
  MK_NATIVE_FN,
  MK_NUMBER,
  MK_OBJECT,
  NumberVal,
  ObjectVal,
} from '../values';

export function createKinImibare(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set('pi', MK_NUMBER(Math.PI)) // PI
      .set(
        'umuzikare', // sqrt
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_IMIBARE.umuzikare expects atleast one argument');
          const arg = (args[0] as NumberVal).value;
          return MK_NUMBER(Math.sqrt(arg));
        }),
      )
      .set(
        'umubare_utazwi', // random
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 2;
          if (args.length < MIN_ARGS_LENGTH)
            LogError(
              'KIN_IMIBARE.umubare_utazwi expects at least two arguments',
            );
          const arg1 = (args[0] as NumberVal).value;
          const arg2 = (args[1] as NumberVal).value;

          if (typeof arg1 != 'number' && typeof arg2 != 'number')
            LogError(
              "KIN_IMIBARE.umubare_utazwi expects 2 arguments of type 'number'",
            );

          const min = Math.ceil(arg1);
          const max = Math.floor(arg2);
          return MK_NUMBER(Math.floor(Math.random() * (max - min + 1)) + min);
        }),
      )
      .set(
        'kuraho_ibice', // round
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_IMIBARE.kuraho_ibice expects at least one argument');
          const arg = (args[0] as NumberVal).value;
          if (typeof arg != 'number')
            LogError(
              'KIN_IMIBARE.kuraho_ibice expects a number as an argument',
            );
          return MK_NUMBER(Math.round(arg));
        }),
      )
      .set(
        'sin',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_IMIBARE.sin expects at least one argument');
          const arg = (args[0] as NumberVal).value;
          if (typeof arg != 'number')
            LogError('KIN_IMIBARE.sin expects a number as an argument');
          return MK_NUMBER(Math.sin(arg));
        }),
      )
      .set(
        'cos',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_IMIBARE.cos expects at least one argument');
          const arg = (args[0] as NumberVal).value;
          if (typeof arg != 'number')
            LogError('KIN_IMIBARE.cos expects a number as an argument');
          return MK_NUMBER(Math.cos(arg));
        }),
      )
      .set(
        'tan',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_IMIBARE.tan expects at least one argument');
          const arg = (args[0] as NumberVal).value;
          if (typeof arg != 'number')
            LogError('KIN_IMIBARE.tan expects a number as an argument');
          return MK_NUMBER(Math.tan(arg));
        }),
      ),
  );
}
