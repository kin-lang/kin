/* eslint-disable @typescript-eslint/no-unused-vars */

/*************************************************************************************************************
 *                                                    Globals                                                *
 *              Global environment for Kin, it contains it's global env, variables and functions             *
 *************************************************************************************************************/

import rl from 'readline-sync';
import { execSync } from 'child_process';
import {
  MK_BOOL,
  MK_NULL,
  MK_NATIVE_FN,
  MK_STRING,
  MK_OBJECT,
  MK_NUMBER,
  StringVal,
  NumberVal,
} from './values';
import Environment from './environment';
import { printValues } from './print';
import moment from 'moment';

export function createGlobalEnv(): Environment {
  const env = new Environment();

  env.declareVar('nibyo', MK_BOOL(true), true);
  env.declareVar('sibyo', MK_BOOL(false), true);
  env.declareVar('ubusa', MK_NULL(), true);

  env.declareVar('ikosa', MK_NULL(), false);

  // Define a native builtin method
  env.declareVar(
    'tangaza_amakuru',
    MK_NATIVE_FN((args) => {
      printValues(args);
      return MK_NULL();
    }),
    true,
  );

  // for executing the system commands
  env.declareVar(
    'sisitemu',
    MK_NATIVE_FN((args) => {
      const cmd = (args[0] as StringVal).value;

      try {
        const result = execSync(cmd, { encoding: 'utf-8' });
        return MK_STRING(result.trim());
      } catch (error) {
        throw error;
      }
    }),
    true,
  );

  // for getting input from a user
  env.declareVar(
    'injiza_amakuru',
    MK_NATIVE_FN((args) => {
      const cmd = (args[0] as StringVal).value;

      try {
        const result = rl.question(cmd);
        if (result !== null) {
          const numberRegex = /^-?\d+(\.\d*)?$/; // regex for numbers and floats
          if (numberRegex.test(result)) return MK_NUMBER(Number(result));
          return MK_STRING(result);
        } else {
          return MK_NULL();
        }
      } catch (error) {
        throw error;
      }
    }),
    true,
  );

  // Kin mathematics utility functions
  env.declareVar(
    'KIN_IMIBARE',
    MK_OBJECT(
      new Map()
        .set('pi', Math.PI) // PI
        .set(
          'umuzikare', // sqrt
          MK_NATIVE_FN((args) => {
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.sqrt(arg));
          }),
        )
        .set(
          'umubare_utazwi', // random
          MK_NATIVE_FN((args) => {
            const arg1 = (args[0] as NumberVal).value;
            const arg2 = (args[1] as NumberVal).value;

            const min = Math.ceil(arg1);
            const max = Math.floor(arg2);
            return MK_NUMBER(Math.floor(Math.random() * (max - min + 1)) + min);
          }),
        )
        .set(
          'kuraho_ibice', // round
          MK_NATIVE_FN((args) => {
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.round(arg));
          }),
        )
        .set(
          'sin',
          MK_NATIVE_FN((args) => {
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.sin(arg));
          }),
        )
        .set(
          'cos',
          MK_NATIVE_FN((args) => {
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.cos(arg));
          }),
        )
        .set(
          'tan',
          MK_NATIVE_FN((args) => {
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.tan(arg));
          }),
        ),
    ),
    true,
  );

  // String manipulation utility functions
  env.declareVar(
    'KIN_AMAGAMBO',
    MK_OBJECT(
      new Map().set(
        'huza_amagambo', // joining 2 string
        MK_NATIVE_FN((args, env) => {
          let res = '';

          for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res += arg.value;
          }

          return MK_STRING(res);
        }),
      ),
    ),
    true,
  );

  env.declareVar(
    'KIN_IGIHE',
    MK_OBJECT(
      new Map()
        .set(
          'isaha',
          MK_NATIVE_FN((args, env) => {
            return MK_STRING(moment().format('HH:mm:ss'));
          }),
        )
        .set(
          'umunsi',
          MK_NATIVE_FN((args, env) => {
            return MK_STRING(moment().format('dddd'));
          }),
        )
        .set(
          'itariki',
          MK_NATIVE_FN((args, env) => {
            return MK_STRING(moment().format('Do MMM YY'));
          }),
        ),
    ),
    true,
  );
  return env;
}
