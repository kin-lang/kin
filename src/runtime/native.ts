/****************************************
 *           defineNative               *
 *   Shared arity / type checks for     *
 *   builtin functions                  *
 ****************************************/

import { KinError } from '../lib/errors';
import { MK_NATIVE_FN, NativeFnValue, RuntimeVal, typeName } from './values';
import Environment from './environment';

export type NativeParamType =
  'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

export interface DefineNativeOptions {
  /** Fully qualified name for error messages, e.g. KIN_URUTONDE.ingano */
  name: string;
  /** Expected types per positional argument. Use 'any' to skip a slot. */
  params?: NativeParamType[];
  /** Minimum argument count. Defaults to params.length when params is set. */
  minArgs?: number;
  /** Maximum argument count. Omit for unlimited (e.g. variadic huza). */
  maxArgs?: number;
  fn: (args: RuntimeVal[], env: Environment) => RuntimeVal;
}

function matchesType(value: RuntimeVal, expected: NativeParamType): boolean {
  if (expected === 'any') return true;
  return value.type === expected;
}

/**
 * Build a native function that checks arity and argument types once,
 * then calls the implementation. Replaces the repeated MIN_ARGS_LENGTH
 * blocks that used to fill globals.ts.
 */
export function defineNative(options: DefineNativeOptions): NativeFnValue {
  const effectiveMin =
    options.minArgs !== undefined
      ? options.minArgs
      : options.params
        ? options.params.length
        : 0;

  return MK_NATIVE_FN((args, env) => {
    if (args.length < effectiveMin) {
      throw new KinError('K017', {
        params: { name: options.name, min: effectiveMin },
        // Keep the classic English shape so older tests and docs still match.
        message: `${options.name} expects at least ${effectiveMin === 1 ? 'one argument' : effectiveMin === 2 ? 'two arguments' : `${effectiveMin} arguments`}`,
      });
    }
    if (options.maxArgs !== undefined && args.length > options.maxArgs) {
      throw new KinError('K011', {
        params: {
          expected: options.maxArgs,
          got: args.length,
        },
        message: `${options.name} expects at most ${options.maxArgs} argument(s)`,
      });
    }

    if (options.params) {
      for (let i = 0; i < options.params.length; i++) {
        const expected = options.params[i];
        if (i >= args.length) break;
        if (!matchesType(args[i], expected)) {
          throw new KinError('K018', {
            params: {
              name: options.name,
              arg: i + 1,
              expected,
              got: typeName(args[i]),
            },
            message: `${options.name} expects argument ${i + 1} to be ${expected}, got ${typeName(args[i])}`,
          });
        }
      }
    }

    return options.fn(args, env);
  });
}
