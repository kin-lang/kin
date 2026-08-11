import moment from 'moment';
import { MK_NATIVE_FN, MK_OBJECT, MK_STRING, ObjectVal } from '../values';

export function createKinIgihe(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'isaha',
        MK_NATIVE_FN(() => {
          return MK_STRING(moment().format('HH:mm:ss'));
        }),
      )
      .set(
        'umunsi',
        MK_NATIVE_FN(() => {
          return MK_STRING(moment().format('dddd'));
        }),
      )
      .set(
        'itariki',
        MK_NATIVE_FN(() => {
          return MK_STRING(moment().format('Do MMM YY'));
        }),
      ),
  );
}
