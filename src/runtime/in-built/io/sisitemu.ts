import { execSync } from 'child_process';
import { LogError } from '../../../lib/log';
import {
  MK_NATIVE_FN,
  MK_STRING,
  NativeFnValue,
  StringVal,
} from '../../values';

export const sisitemu: NativeFnValue = MK_NATIVE_FN((args) => {
  const MIN_ARGS_LENGTH = 1;
  if (args.length < MIN_ARGS_LENGTH)
    LogError('sisitemu expects at least one argument');
  const cmd = (args[0] as StringVal).value;

  try {
    const result = execSync(cmd, { encoding: 'utf-8' });
    return MK_STRING(result.trim());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.toString() : String(error);
    throw new Error(message, { cause: error });
  }
});
