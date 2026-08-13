import moment from 'moment';
import { MK_OBJECT, MK_STRING, ObjectVal } from '../values';
import { defineNative } from '../native';

/** KIN_IGIHE — clock / calendar helpers. */
export function createKinIgihe(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'isaha',
        defineNative({
          name: 'KIN_IGIHE.isaha',
          minArgs: 0,
          fn: () => MK_STRING(moment().format('HH:mm:ss')),
        }),
      )
      .set(
        'umunsi',
        defineNative({
          name: 'KIN_IGIHE.umunsi',
          minArgs: 0,
          fn: () => MK_STRING(moment().format('dddd')),
        }),
      )
      .set(
        'itariki',
        defineNative({
          name: 'KIN_IGIHE.itariki',
          minArgs: 0,
          fn: () => MK_STRING(moment().format('Do MMM YY')),
        }),
      ),
  );
}
