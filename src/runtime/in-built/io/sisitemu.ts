import { execSync } from 'child_process';
import { MK_STRING, NativeFnValue, StringVal } from '../../values';
import { defineNative } from '../../native';

export const sisitemu: NativeFnValue = defineNative({
  name: 'sisitemu',
  params: ['string'],
  fn: (args) => {
    const cmd = (args[0] as StringVal).value;
    try {
      const result = execSync(cmd, { encoding: 'utf-8' });
      return MK_STRING(result.trim());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.toString() : String(error);
      throw new Error(message, { cause: error });
    }
  },
});
