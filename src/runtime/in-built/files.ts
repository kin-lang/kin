import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  unlinkSync as deleteFileSync,
} from 'fs';
import Environment from '../environment';
import { MK_BOOL, MK_OBJECT, MK_STRING, ObjectVal, StringVal } from '../values';
import { defineNative } from '../native';
import { resolveKinPath } from '../path-resolve';

function filePathFrom(env: Environment, relative: string): string {
  return resolveKinPath(env, relative);
}

/** KIN_INYANDIKO — file I/O relative to the running script. */
export function createKinInyandiko(): ObjectVal {
  return MK_OBJECT(
    new Map()
      .set(
        'soma',
        defineNative({
          name: 'KIN_INYANDIKO.soma',
          params: ['string'],
          fn: (args, e) => {
            const file_location = filePathFrom(e, (args[0] as StringVal).value);
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
            const file_location = filePathFrom(e, (args[0] as StringVal).value);
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
            const file_location = filePathFrom(e, (args[0] as StringVal).value);
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
            const file_location = filePathFrom(e, (args[0] as StringVal).value);
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
  );
}
