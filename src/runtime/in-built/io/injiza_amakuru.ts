import prompt from 'prompt-sync';
import { MK_NULL, MK_NUMBER, MK_STRING, NativeFnValue } from '../../values';
import { defineNative } from '../../native';
import { makeValues } from '../../print';

export const injiza_amakuru: NativeFnValue = defineNative({
  name: 'injiza_amakuru',
  minArgs: 1,
  fn: (args) => {
    const cmd = makeValues(args).value;
    try {
      const result = prompt()(cmd);
      if (result !== null) {
        const numberRegex = /^-?\d+(\.\d*)?$/;
        if (numberRegex.test(result)) return MK_NUMBER(Number(result));
        return MK_STRING(result);
      }
      return MK_NULL();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.toString() : String(error);
      throw new Error(message, { cause: error });
    }
  },
});
