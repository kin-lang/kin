import { MK_NUMBER, MK_OBJECT, NumberVal, ObjectVal } from '../values';
import { defineNative } from '../native';

/** KIN_IMIBARE — math helpers (sqrt, random, trig, …). */
export function createKinImibare(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set('pi', MK_NUMBER(Math.PI))
      .set(
        'umuzikare',
        defineNative({
          name: 'KIN_IMIBARE.umuzikare',
          params: ['number'],
          fn: (args) => MK_NUMBER(Math.sqrt((args[0] as NumberVal).value)),
        }),
      )
      .set(
        'umubare_utazwi',
        defineNative({
          name: 'KIN_IMIBARE.umubare_utazwi',
          params: ['number', 'number'],
          fn: (args) => {
            const arg1 = (args[0] as NumberVal).value;
            const arg2 = (args[1] as NumberVal).value;
            const min = Math.ceil(arg1);
            const max = Math.floor(arg2);
            return MK_NUMBER(Math.floor(Math.random() * (max - min + 1)) + min);
          },
        }),
      )
      .set(
        'kuraho_ibice',
        defineNative({
          name: 'KIN_IMIBARE.kuraho_ibice',
          params: ['number'],
          fn: (args) => MK_NUMBER(Math.round((args[0] as NumberVal).value)),
        }),
      )
      .set(
        'sin',
        defineNative({
          name: 'KIN_IMIBARE.sin',
          params: ['number'],
          fn: (args) => MK_NUMBER(Math.sin((args[0] as NumberVal).value)),
        }),
      )
      .set(
        'cos',
        defineNative({
          name: 'KIN_IMIBARE.cos',
          params: ['number'],
          fn: (args) => MK_NUMBER(Math.cos((args[0] as NumberVal).value)),
        }),
      )
      .set(
        'tan',
        defineNative({
          name: 'KIN_IMIBARE.tan',
          params: ['number'],
          fn: (args) => MK_NUMBER(Math.tan((args[0] as NumberVal).value)),
        }),
      ),
  );
}
