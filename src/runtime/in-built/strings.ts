import {
  MK_ARRAY,
  MK_NUMBER,
  MK_OBJECT,
  MK_STRING,
  NumberVal,
  ObjectVal,
  StringVal,
} from '../values';
import { defineNative } from '../native';

/** KIN_AMAGAMBO — string helpers. */
export function createKinAmagambo(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'huza',
        defineNative({
          name: 'KIN_AMAGAMBO.huza',
          minArgs: 0,
          fn: (args) => {
            let res = '';
            for (let i = 0; i < args.length; i++) {
              res += (args[i] as StringVal).value;
            }
            return MK_STRING(res);
          },
        }),
      )
      .set(
        'ingano',
        defineNative({
          name: 'KIN_AMAGAMBO.ingano',
          params: ['string'],
          fn: (args) => MK_NUMBER((args[0] as StringVal).value.length),
        }),
      )
      .set(
        'inyuguti',
        defineNative({
          name: 'KIN_AMAGAMBO.inyuguti',
          params: ['string', 'number'],
          fn: (args) => {
            const s = (args[0] as StringVal).value;
            const i = (args[1] as NumberVal).value;
            return MK_STRING(s.charAt(i));
          },
        }),
      )
      .set(
        'inyuguti_nkuru',
        defineNative({
          name: 'KIN_AMAGAMBO.inyuguti_nkuru',
          params: ['string'],
          fn: (args) => MK_STRING((args[0] as StringVal).value.toUpperCase()),
        }),
      )
      .set(
        'inyuguti_ntoya',
        defineNative({
          name: 'KIN_AMAGAMBO.inyuguti_ntoya',
          params: ['string'],
          fn: (args) => MK_STRING((args[0] as StringVal).value.toLowerCase()),
        }),
      )
      .set(
        'tandukanya',
        defineNative({
          name: 'KIN_AMAGAMBO.tandukanya',
          params: ['string', 'string'],
          fn: (args) => {
            const s = (args[0] as StringVal).value;
            const separator = (args[1] as StringVal).value;
            return MK_ARRAY(s.split(separator).map((part) => MK_STRING(part)));
          },
        }),
      ),
  );
}
