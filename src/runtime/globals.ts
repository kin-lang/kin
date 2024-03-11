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
      const MIN_ARGS_LENGTH = 1;
      if (args.length < MIN_ARGS_LENGTH)
        throw new Error('sisitemu expects at least one argument');
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
      const MIN_ARGS_LENGTH = 1;
      if (args.length < MIN_ARGS_LENGTH)
        throw new Error('injiza_amakuru expects at least one argument');
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

  env.declareVar(
    'hagarara',
    MK_NATIVE_FN((args) => {
      const MIN_ARGS_LENGTH = 1;
      if (args.length < MIN_ARGS_LENGTH)
        throw new Error('sisitemu expects atleast one argument');
      const exit_code = (args[0] as NumberVal).value;
      if (exit_code != 0 && exit_code != 1)
        throw new Error('hagarara expects 1 or 0 as exit codes');
      process.exit(exit_code);
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
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_IMIBARE.umuzikare expects atleast one argument',
              );
            const arg = (args[0] as NumberVal).value;
            return MK_NUMBER(Math.sqrt(arg));
          }),
        )
        .set(
          'umubare_utazwi', // random
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_IMIBARE.umubare_utazwi expects at least two arguments',
              );
            const arg1 = (args[0] as NumberVal).value;
            const arg2 = (args[1] as NumberVal).value;

            if (typeof arg1 != 'number' && typeof arg2 != 'number')
              throw new Error(
                "KIN_IMIBARE.umubare_utazwi expects 2 arguments of type 'number'",
              );

            const min = Math.ceil(arg1);
            const max = Math.floor(arg2);
            return MK_NUMBER(Math.floor(Math.random() * (max - min + 1)) + min);
          }),
        )
        .set(
          'kuraho_ibice', // round
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_IMIBARE.kuraho_ibice expects at least one argument',
              );
            const arg = (args[0] as NumberVal).value;
            if (typeof arg != 'number')
              throw new Error(
                'KIN_IMIBARE.kuraho_ibice expects a number as an argument',
              );
            return MK_NUMBER(Math.round(arg));
          }),
        )
        .set(
          'sin',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error('KIN_IMIBARE.sin expects at least one argument');
            const arg = (args[0] as NumberVal).value;
            if (typeof arg != 'number')
              throw new Error(
                'KIN_IMIBARE.sin expects a number as an argument',
              );
            return MK_NUMBER(Math.sin(arg));
          }),
        )
        .set(
          'cos',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error('KIN_IMIBARE.cos expects at least one argument');
            const arg = (args[0] as NumberVal).value;
            if (typeof arg != 'number')
              throw new Error(
                'KIN_IMIBARE.cos expects a number as an argument',
              );
            return MK_NUMBER(Math.cos(arg));
          }),
        )
        .set(
          'tan',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error('KIN_IMIBARE.tan expects at least one argument');
            const arg = (args[0] as NumberVal).value;
            if (typeof arg != 'number')
              throw new Error(
                'KIN_IMIBARE.tan expects a number as an argument',
              );
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
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_AMAGAMBO.ingano expects at least one argument',
              );
            const str = (args[0] as StringVal).value;
            if (typeof str != 'string')
              throw new Error(
                'KIN_AMAGAMBO.ingano expects string as an argument',
              );
            return MK_NUMBER(str.length);
          }),
        )
        .set(
          'inyuguti',
          MK_NATIVE_FN((args, env) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_AMAGAMBO.inyuguti expects at least two argument',
              );
            const str = (args[0] as StringVal).value;
            const charIndex = (args[1] as NumberVal).value;
            if (typeof str != 'string')
              throw new Error(
                'first argument of KIN_AMABAMBO.inyuguti must be a string',
              );
            else if (typeof charIndex != 'number')
              throw new Error(
                'second argument of KIN_AMABAMBO.inyuguti must be a number',
              );
            return MK_STRING(str.charAt(charIndex));
          }),
        )
        .set(
          'inyuguti_nkuru',
          MK_NATIVE_FN((args, env) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_AMAGAMBO.inyuguti_nkuru expects at least one argument',
              );
            const str = (args[0] as StringVal).value;
            if (typeof str != 'string')
              throw new Error(
                'KIN_AMAGAMBO.inyuguti_nkuru expect a string as an argument',
              );
            return MK_STRING(str.toUpperCase());
          }),
        )
        .set(
          'inyuguti_ntoya',
          MK_NATIVE_FN((args, env) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_AMAGAMBO.inyuguti_ntoya expects at least one argument',
              );
            const str = (args[0] as StringVal).value;
            if (typeof str != 'string')
              throw new Error(
                'KIN_AMAGAMBO.inyuguti_ntoya expect a string as an argument',
              );
            return MK_STRING(str.toLowerCase());
          }),
        )
        .set(
          'tandukanya', // splitting a string
          MK_NATIVE_FN((args, env) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_AMAGAMBO.tangukanya expects at least two argument',
              );
            const str = (args[0] as StringVal).value;
            const separator = (args[1] as StringVal).value;
            if (typeof str != 'string' || typeof separator != 'string')
              throw new Error(
                'KIN_AMAGAMBO.tandukanya expects 2 arguments to be strings',
              );
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
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.ingano expects at least one argument',
              );
            const obj = args[0] as ObjectVal;
            if (typeof obj != 'object')
              throw new Error(
                'KIN_URUTONDE.ingano expects argument to be an array',
              );
            return MK_NUMBER(obj.properties.size);
          }),
        )
        .set(
          'ongera_kumusozo',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.ongera_kumusozo expects at least two arguments',
              );
            const obj = args[0] as ObjectVal;
            const val = args[1];
            if (typeof obj != 'object')
              throw new Error(
                'KIN_URUTONDE.ongera_kumusozo expects first argument to be an array',
              );
            const key = obj.properties.size; // get the size of the map
            obj.properties.set(key.toString(), val);
            return MK_NUMBER(obj.properties.size); // return the new size of arr.
          }),
        )
        .set(
          'siba_kumusozo',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.siba_kumusozo expects at least one argument',
              );
            const obj = args[0] as ObjectVal;
            if (typeof obj != 'object')
              throw new Error(
                'KIN_URUTONDE.siba_kumusozo expects an argument to be an array',
              );
            obj.properties.delete((obj.properties.size - 1).toString()); // remove the last element
            return MK_NUMBER(obj.properties.size); // return the new size of arr.
          }),
        )
        .set(
          'ifite_ikirango',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.ifite_ikirango expects at least two arguments',
              );
            const arr = args[0] as ObjectVal;
            const val = args[1] as StringVal;

            return MK_BOOL(arr.properties.has(val.value));
          }),
        )
        .set(
          'ifite',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.ifite expects at least two arguments',
              );
            const obj = args[0] as ObjectVal; // map with <key, value>
            const arr = obj.properties.values(); // only map's values
            const val = args[1] as StringVal; // value to check
            return MK_BOOL(arr.next().value.value === val.value);
          }),
        )
        .set(
          'kora_ijambo',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.kora_ijambo expects at least one argument',
              );
            const obj = args[0] as ObjectVal; // map with <key, value>
            const str = Array.from(obj.properties.values())
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((v: any) => v?.value)
              .join('');
            return MK_STRING(str);
          }),
        )
        .set(
          'injiza_ahabanza',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.injiza_ahabanza expects at least two arguments',
              );
            const obj = args[0] as ObjectVal;
            if (typeof obj != 'object')
              throw new Error(
                'KIN_URUTONDE.injiza_ahabanza expects an argument to be an array',
              );
            const val = args[1] as RuntimeVal;

            // New array with new value
            const newArr: ObjectVal = { type: 'object', properties: new Map() };

            // Setting values accordingly && Shift existing elements' keys by 1
            newArr.properties.set('0', val);

            for (const [key, value] of obj.properties) {
              newArr.properties.set((parseInt(key) + 1).toString(), value);
            }

            return newArr;
          }),
        )
        .set(
          'siba_ahabanza',
          MK_NATIVE_FN((args) => {
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.siba_ahabanza expects at least one argument',
              );
            const obj = args[0] as ObjectVal;
            if (typeof obj != 'object')
              throw new Error(
                'KIN_URUTONDE.siba_ahabanza expects an argument to be an array',
              );

            // New array with removed value
            const newArr: ObjectVal = { type: 'object', properties: new Map() };

            // Skip the first element
            for (const [key, value] of obj.properties) {
              if (parseInt(key) !== 0) {
                newArr.properties.set((parseInt(key) - 1).toString(), value);
              }
            }

            return newArr;
          }),
        ),
    ),
    true,
  );

  env.declareVar(
    'ubwoko',
    MK_NATIVE_FN((args) => {
      const MIN_ARGS_LENGTH = 1;
      if (args.length < MIN_ARGS_LENGTH)
        throw new Error('ubwoko expects at least one argument');
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
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_INYANDIKO.soma expects at least one argument',
              );
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
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.andika expects at least two arguments',
              );
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
            const MIN_ARGS_LENGTH = 2;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.vugurura expects at least two arguments',
              );
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
            const MIN_ARGS_LENGTH = 1;
            if (args.length < MIN_ARGS_LENGTH)
              throw new Error(
                'KIN_URUTONDE.siba expects at least one argument',
              );
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
