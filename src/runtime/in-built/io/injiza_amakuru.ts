import prompt from 'prompt-sync';
import { LogError } from '../../../lib/log';
import { makeValues } from '../../print';
import {
  MK_NATIVE_FN,
  MK_NULL,
  MK_NUMBER,
  MK_STRING,
  NativeFnValue,
} from '../../values';

export const injiza_amakuru: NativeFnValue = MK_NATIVE_FN((args) => {
  const MIN_ARGS_LENGTH = 1;
  if (args.length < MIN_ARGS_LENGTH)
    LogError('injiza_amakuru expects at least one argument');
  const cmd = makeValues(args).value;

  try {
    const result = prompt()(cmd);
    if (result !== null) {
      const numberRegex = /^-?\d+(\.\d*)?$/; // regex for numbers and floats
      if (numberRegex.test(result)) return MK_NUMBER(Number(result));
      return MK_STRING(result);
    } else {
      return MK_NULL();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.toString() : String(error);
    throw new Error(message, { cause: error });
  }
});
