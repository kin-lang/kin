import { createKinError } from '../../../lib/errors';
import { NativeFnValue, NumberVal } from '../../values';
import { defineNative } from '../../native';

/**
 * Process exit. Named hagarara in the env; the lexer keyword shadows it
 * in source, so it is only reachable via the JS API.
 */
export const hagarara: NativeFnValue = defineNative({
  name: 'hagarara',
  params: ['number'],
  fn: (args) => {
    const exit_code = (args[0] as NumberVal).value;
    if (exit_code != 0 && exit_code != 1) {
      throw createKinError('K025', {
        message: 'hagarara expects 1 or 0 as exit codes',
      });
    }
    process.exit(exit_code);
  },
});
