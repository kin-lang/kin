import { LogError } from '../../../lib/log';
import { MK_NATIVE_FN, NativeFnValue, NumberVal } from '../../values';

export const hagarara: NativeFnValue = MK_NATIVE_FN((args) => {
  const MIN_ARGS_LENGTH = 1;
  if (args.length < MIN_ARGS_LENGTH)
    LogError('sisitemu expects atleast one argument');
  const exit_code = (args[0] as NumberVal).value;
  if (exit_code != 0 && exit_code != 1)
    LogError('hagarara expects 1 or 0 as exit codes');
  process.exit(exit_code);
});
