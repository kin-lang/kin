import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  unlinkSync as deleteFileSync,
} from 'fs';
import path from 'path';
import { LogError } from '../../lib/log';
import Environment from '../environment';
import {
  MK_BOOL,
  MK_NATIVE_FN,
  MK_OBJECT,
  MK_STRING,
  ObjectVal,
  StringVal,
} from '../values';

function resolveKinFile(env: Environment, relativePath: string): string {
  return path.join(
    path.dirname(
      path.join(process.cwd(), (env.lookupVar('filename') as StringVal).value),
    ),
    relativePath,
  );
}

export function createKinInyandiko(env: Environment): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'soma',
        MK_NATIVE_FN((args) => {
          const MIN_ARGS_LENGTH = 1;
          if (args.length < MIN_ARGS_LENGTH)
            LogError('KIN_INYANDIKO.soma expects at least one argument');
          const file_location = resolveKinFile(
            env,
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
            LogError('KIN_URUTONDE.andika expects at least two arguments');
          const file_location = resolveKinFile(
            env,
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
            LogError('KIN_URUTONDE.vugurura expects at least two arguments');
          const file_location = resolveKinFile(
            env,
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
            LogError('KIN_URUTONDE.siba expects at least one argument');
          const file_location = resolveKinFile(
            env,
            (args[0] as StringVal).value,
          );
          const _data = args[1] as StringVal;
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
  );
}
