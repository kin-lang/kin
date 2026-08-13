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
  MK_ARRAY,
  StringVal,
  NumberVal,
  RuntimeVal,
  ArrayVal,
  typeName,
} from './values';
import Environment from './environment';
import { makeValues, printValues } from './print';
import moment from 'moment';
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  unlinkSync as deleteFileSync,
} from 'fs';
import path from 'path';
import { createKinError } from '../lib/errors';
import { defineNative } from './native';
import { valuesEqual } from './values';

function filePathFrom(env: Environment, relative: string): string {
  return path.join(
    path.dirname(
      path.join(process.cwd(), (env.lookupVar('filename') as StringVal).value),
    ),
    relative,
  );
}

export function createGlobalEnv(filename: string): Environment {
  const env = new Environment();
  env.declareVar('filename', MK_STRING(filename), true);
  env.declareVar('nibyo', MK_BOOL(true), true);
  env.declareVar('sibyo', MK_BOOL(false), true);
  env.declareVar('ubusa', MK_NULL(), true);

  env.declareVar('ikosa', MK_NULL(), false);

  env.declareVar(
    'tangaza_amakuru',
    MK_NATIVE_FN((args) => {
      printValues(args);
      return MK_NULL();
    }),
    true,
  );

  env.declareVar(
    'sisitemu',
    defineNative({
      name: 'sisitemu',
      params: ['string'],
      fn: (args) => {
        const cmd = (args[0] as StringVal).value;
        try {
          const result = execSync(cmd, { encoding: 'utf-8' });
          return MK_STRING(result.trim());
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.toString() : String(error);
          throw new Error(message, { cause: error });
        }
      },
    }),
    true,
  );

  env.declareVar(
    'injiza_amakuru',
    defineNative({
      name: 'injiza_amakuru',
      minArgs: 1,
      fn: (args) => {
        const cmd = makeValues(args).value;
        try {
          const result = prompt()(cmd);
          if (result !== null) {
            const numberRegex = /^-?\d+(\.\d*)?$/;
            if (numberRegex.test(result)) return MK_NUMBER(Number(result));
            return MK_STRING(result);
          }
          return MK_NULL();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.toString() : String(error);
          throw new Error(message, { cause: error });
        }
      },
    }),
    true,
  );

  // Process exit. Named hagarara in the env; the lexer keyword shadows it
  // in source, so it is only reachable via the JS API.
  env.declareVar(
    'hagarara',
    defineNative({
      name: 'hagarara',
      params: ['number'],
      fn: (args) => {
        const exit_code = (args[0] as NumberVal).value;
        if (exit_code != 0 && exit_code != 1) {
          throw createKinError('K025', {
            message: 'hagarara expects 1 or 0 as exit codes',
          });
        }
        process.exit(exit_code);
      },
    }),
    true,
  );

  env.declareVar(
    'KIN_IMIBARE',
    MK_OBJECT(
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
              return MK_NUMBER(
                Math.floor(Math.random() * (max - min + 1)) + min,
              );
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
    ),
    true,
  );

  env.declareVar(
    'KIN_AMAGAMBO',
    MK_OBJECT(
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
              return MK_ARRAY(
                s.split(separator).map((part) => MK_STRING(part)),
              );
            },
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
    ),
    true,
  );

  env.declareVar(
    'KIN_URUTONDE',
    MK_OBJECT(
      new Map()
        .set(
          'ingano',
          defineNative({
            name: 'KIN_URUTONDE.ingano',
            params: ['array'],
            fn: (args) => MK_NUMBER((args[0] as ArrayVal).elements.length),
          }),
        )
        .set(
          'ongera_kumusozo',
          defineNative({
            name: 'KIN_URUTONDE.ongera_kumusozo',
            params: ['array', 'any'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              arr.elements.push(args[1]);
              return MK_NUMBER(arr.elements.length);
            },
          }),
        )
        .set(
          'siba_kumusozo',
          defineNative({
            name: 'KIN_URUTONDE.siba_kumusozo',
            params: ['array'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              if (arr.elements.length > 0) arr.elements.pop();
              return MK_NUMBER(arr.elements.length);
            },
          }),
        )
        .set(
          'ifite_ikirango',
          defineNative({
            name: 'KIN_URUTONDE.ifite_ikirango',
            params: ['array', 'string'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              const key = (args[1] as StringVal).value;
              const idx = Number(key);
              return MK_BOOL(
                Number.isInteger(idx) && idx >= 0 && idx < arr.elements.length,
              );
            },
          }),
        )
        .set(
          'ifite',
          defineNative({
            name: 'KIN_URUTONDE.ifite',
            params: ['array', 'any'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              const needle = args[1];
              for (const el of arr.elements) {
                if (valuesEqual(el, needle)) return MK_BOOL(true);
              }
              return MK_BOOL(false);
            },
          }),
        )
        .set(
          'kora_ijambo',
          defineNative({
            name: 'KIN_URUTONDE.kora_ijambo',
            params: ['array'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              const str = arr.elements
                .map((v: RuntimeVal) => {
                  if (
                    'value' in v &&
                    v.value !== null &&
                    v.value !== undefined
                  ) {
                    return String((v as { value: unknown }).value);
                  }
                  return '';
                })
                .join('');
              return MK_STRING(str);
            },
          }),
        )
        .set(
          'injiza_ahabanza',
          defineNative({
            name: 'KIN_URUTONDE.injiza_ahabanza',
            params: ['array', 'any'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              return MK_ARRAY([args[1], ...arr.elements]);
            },
          }),
        )
        .set(
          'siba_ahabanza',
          defineNative({
            name: 'KIN_URUTONDE.siba_ahabanza',
            params: ['array'],
            fn: (args) => {
              const arr = args[0] as ArrayVal;
              return MK_ARRAY(arr.elements.slice(1));
            },
          }),
        ),
    ),
    true,
  );

  env.declareVar(
    'ubwoko',
    defineNative({
      name: 'ubwoko',
      minArgs: 1,
      fn: (args) => MK_STRING(typeName(args[0])),
    }),
    true,
  );

  env.declareVar(
    'KIN_INYANDIKO',
    MK_OBJECT(
      new Map()
        .set(
          'soma',
          defineNative({
            name: 'KIN_INYANDIKO.soma',
            params: ['string'],
            fn: (args, e) => {
              const file_location = filePathFrom(
                e,
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
            },
          }),
        )
        .set(
          'andika',
          defineNative({
            name: 'KIN_INYANDIKO.andika',
            params: ['string', 'string'],
            fn: (args, e) => {
              const file_location = filePathFrom(
                e,
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
            },
          }),
        )
        .set(
          'vugurura',
          defineNative({
            name: 'KIN_INYANDIKO.vugurura',
            params: ['string', 'string'],
            fn: (args, e) => {
              const file_location = filePathFrom(
                e,
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
            },
          }),
        )
        .set(
          'siba',
          defineNative({
            name: 'KIN_INYANDIKO.siba',
            params: ['string'],
            fn: (args, e) => {
              const file_location = filePathFrom(
                e,
                (args[0] as StringVal).value,
              );
              try {
                deleteFileSync(file_location);
                return MK_BOOL();
              } catch (error: unknown) {
                if (error instanceof Error) {
                  return MK_STRING(error.message);
                }
                return MK_STRING(error as string);
              }
            },
          }),
        ),
    ),
    true,
  );

  return env;
}
