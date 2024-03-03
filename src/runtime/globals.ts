/* eslint-disable @typescript-eslint/no-unused-vars */

/*************************************************************************************************************
 *                                                    Globals                                                *
 *              Global environment for Kin, it contains it's global env, variables and functions             *
 *************************************************************************************************************/
import prompt from 'prompt-sync';
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
  RuntimeVal,
  ObjectVal,
} from './values';
import Environment from './environment';
import { printValues } from './print';
import moment from 'moment';
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  unlinkSync as deleteFileSync,
} from 'fs';
import path from 'path';
import { Runtime } from 'inspector';
import { NumericLiteral } from '../parser/ast';

export function createGlobalEnv(filename: string): Environment {
  const env = new Environment();
  env.declareVar('filename', MK_STRING(filename), true);
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
        const result = prompt()(cmd);
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
      new Map()
        .set(
          'huza', // joining 2 string
          MK_NATIVE_FN((args, env) => {
            let res = '';

            for (let i = 0; i < args.length; i++) {
              const arg = args[i] as StringVal;

              res += arg.value;
            }

            return MK_STRING(res);
          }),
        )
        .set(
          'ingano',
          MK_NATIVE_FN((args, env) => {
            const str = (args[0] as StringVal).value;
            return MK_NUMBER(str.length);
          }),
        )
        .set(
          'inyuguti',
          MK_NATIVE_FN((args, env) => {
            const str = (args[0] as StringVal).value;
            const charIndex = (args[1] as NumberVal).value;
            return MK_STRING(str.charAt(charIndex));
          }),
        )
        .set(
          'inyuguti_nkuru',
          MK_NATIVE_FN((args, env) => {
            const str = (args[0] as StringVal).value;
            return MK_STRING(str.toUpperCase());
          }),
        )
        .set(
          'inyuguti_ntoya',
          MK_NATIVE_FN((args, env) => {
            const str = (args[0] as StringVal).value;
            return MK_STRING(str.toLowerCase());
          }),
        )
        .set(
          'tandukanya', // splitting a string
          MK_NATIVE_FN((args, env) => {
            const str = (args[0] as StringVal).value;
            const separator = (args[1] as StringVal).value;
            const arr = new Map<string, RuntimeVal>();
            str.split(separator).map((s, i) => {
              // s for string and i for index
              arr.set(i.toString(), MK_STRING(s));
            });
            return MK_OBJECT(arr);
          }),
        ),
    ),
    true,
  );

  // time built in function for KIN
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

  env.declareVar(
    'KIN_URUTONDE',
    MK_OBJECT(
      new Map()
        .set(
          'ingano',
          MK_NATIVE_FN((args) => {
            const obj = args[0] as ObjectVal;
            return MK_NUMBER(obj.properties.size);
          }),
        )
        .set(
          'ongera_kumusozo',
          MK_NATIVE_FN((args) => {
            const obj = args[0] as ObjectVal;
            const val = args[1];
            const key = obj.properties.size; // get the size of the map
            obj.properties.set(key.toString(), val);
            return MK_NUMBER(obj.properties.size); // return the new size of arr.
          }),
        )
        .set(
          'siba_kumusozo',
          MK_NATIVE_FN((args) => {
            const obj = args[0] as ObjectVal;
            obj.properties.delete((obj.properties.size - 1).toString()); // remove the last element
            return MK_NUMBER(obj.properties.size); // return the new size of arr.
          }),
        )
        .set(
          'ifite_ikirango',
          MK_NATIVE_FN((args) => {
            const arr = args[0] as ObjectVal;
            const val = args[1] as StringVal;

            return MK_BOOL(arr.properties.has(val.value));
          }),
        )
        .set(
          'ifite',
          MK_NATIVE_FN((args) => {
            const obj = args[0] as ObjectVal; // map with <key, value>
            const arr = obj.properties.values(); // only map's values
            const val = args[1] as StringVal; // value to check
            return MK_BOOL(arr.next().value.value === val.value);
          }),
        )
        .set(
          'kora_ijambo',
          MK_NATIVE_FN((args) => {
            const obj = args[0] as ObjectVal; // map with <key, value>
            const str = Array.from(obj.properties.values())
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((v: any) => v?.value)
              .join('');
            return MK_STRING(str);
          }),
        ),
    ),
    true,
  );

  env.declareVar(
    'ubwoko',
    MK_NATIVE_FN((args) => {
      return MK_STRING(args[0].type);
    }),
    true,
  );

  env.declareVar(
    'KIN_INYANDIKO',
    MK_OBJECT(
      new Map()
        .set(
          'soma',
          MK_NATIVE_FN((args) => {
            const file_location = path.join(
              path.dirname(
                path.join(
                  process.cwd(),
                  (env.lookupVar('filename') as StringVal).value,
                ),
              ),
              (args[0] as StringVal).value,
            );
            try {
              const data = readFileSync(file_location, 'utf-8');
              return MK_STRING(data);
            } catch (error) {
              if (error instanceof Error) {
                return MK_STRING(error.message);
              }

              return MK_STRING(error as string);
            }
          }),
        )
        .set(
          'andika',
          MK_NATIVE_FN((args) => {
            const file_location = path.join(
              path.dirname(
                path.join(
                  process.cwd(),
                  (env.lookupVar('filename') as StringVal).value,
                ),
              ),
              (args[0] as StringVal).value,
            );
            const data = args[1] as StringVal;
            try {
              writeFileSync(file_location, data.value, 'utf-8');
              return MK_BOOL();
            } catch (error: unknown) {
              if (error instanceof Error) {
                return MK_STRING(error.message);
              }

              return MK_STRING(error as string);
            }
          }),
        )
        .set(
          'vugurura',
          MK_NATIVE_FN((args) => {
            const file_location = path.join(
              path.dirname(
                path.join(
                  process.cwd(),
                  (env.lookupVar('filename') as StringVal).value,
                ),
              ),
              (args[0] as StringVal).value,
            );
            const data = args[1] as StringVal;
            try {
              appendFileSync(file_location, data.value, 'utf-8');
              return MK_BOOL();
            } catch (error: unknown) {
              if (error instanceof Error) {
                return MK_STRING(error.message);
              }

              return MK_STRING(error as string);
            }
          }),
        )
        .set(
          'siba',
          MK_NATIVE_FN((args) => {
            const file_location = path.join(
              path.dirname(
                path.join(
                  process.cwd(),
                  (env.lookupVar('filename') as StringVal).value,
                ),
              ),
              (args[0] as StringVal).value,
            );
            const data = args[1] as StringVal;
            try {
              deleteFileSync(file_location);
              return MK_BOOL();
            } catch (error: unknown) {
              if (error instanceof Error) {
                return MK_STRING(error.message);
              }

              return MK_STRING(error as string);
            }
          }),
        ),
    ),
    true,
  );

  return env;
}
