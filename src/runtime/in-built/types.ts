import { LogError } from '../../lib/log';
import { MK_NATIVE_FN, MK_STRING, NativeFnValue } from '../values';

export const ubwoko: NativeFnValue = MK_NATIVE_FN((args) => {
  const MIN_ARGS_LENGTH = 1;
  if (args.length < MIN_ARGS_LENGTH)
    LogError('ubwoko expects at least one argument');
  return MK_STRING(args[0].type);
});
