import { MK_STRING, NativeFnValue, typeName } from '../values';
import { defineNative } from '../native';

/** ubwoko — runtime type name of a value (urutonde for arrays). */
export const ubwoko: NativeFnValue = defineNative({
  name: 'ubwoko',
  minArgs: 1,
  fn: (args) => MK_STRING(typeName(args[0])),
});
