import { MK_NATIVE_FN, MK_NULL, NativeFnValue } from '../../values';
import { printValues } from '../../print';

export const tangaza_amakuru: NativeFnValue = MK_NATIVE_FN((args) => {
  printValues(args);
  return MK_NULL();
});
