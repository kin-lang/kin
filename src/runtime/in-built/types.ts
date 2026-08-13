import { NativeFnValue, ubwokoOf } from '../values';
import { defineNative } from '../native';

/**
 * ubwoko — returns a type value (TypeVal / ClassVal for instances).
 * Source code usually uses the keyword form: `ubwoko x` / `ubwoko(x)`.
 * This native remains for the env API and identity comparisons.
 */
export const ubwoko: NativeFnValue = defineNative({
  name: 'ubwoko',
  minArgs: 1,
  fn: (args) => ubwokoOf(args[0]),
});
