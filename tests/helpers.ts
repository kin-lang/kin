import Parser from '../src/parser/parser';
import {
  ArrayVal,
  BooleanVal,
  NativeFnValue,
  NumberVal,
  ObjectVal,
  RuntimeVal,
  StringVal,
} from '../src/runtime/values';
import Environment from '../src/runtime/environment';
import { KinError } from '../src/lib/errors';
import { TypeSafetyMode } from '../src/runtime/types';
import { runSource } from '../src/runtime/run';

export function evaluate(
  sourceCode: string,
  filename = 'test.kin',
  options: { typeSafety?: TypeSafetyMode | string } = {},
): { result: RuntimeVal; env: Environment } {
  const { result, env } = runSource(sourceCode, {
    filename,
    typeSafety: options.typeSafety,
  });
  return { result, env };
}

type KinErrorClass = new (
  code: string,
  options?: ConstructorParameters<typeof KinError>[1],
) => KinError;

/**
 * Assert that `fn` throws a KinError of the expected class and optional fields.
 * Overload used by taxonomy tests: `expectKinError(fn, Class, { ERRNAME, ... })`.
 */
export function expectThrownKinError(
  fn: () => unknown,
  ErrorClass: KinErrorClass | typeof KinError = KinError,
  match: {
    code?: string;
    ERRNAME?: string;
    ERRCODE?: string;
    message?: string | RegExp;
  } = {},
): KinError {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof ErrorClass)) {
      throw new Error(
        `Expected ${ErrorClass.name}, got ${
          e instanceof Error ? e.constructor.name : typeof e
        }: ${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }
    const err = e as KinError;
    if (match.code !== undefined && err.code !== match.code) {
      throw new Error(
        `Expected code ${match.code}, got ${err.code}: ${err.message}`,
        { cause: e },
      );
    }
    if (match.ERRNAME !== undefined && err.ERRNAME !== match.ERRNAME) {
      throw new Error(`Expected ERRNAME ${match.ERRNAME}, got ${err.ERRNAME}`, {
        cause: e,
      });
    }
    if (match.ERRCODE !== undefined && err.ERRCODE !== match.ERRCODE) {
      throw new Error(`Expected ERRCODE ${match.ERRCODE}, got ${err.ERRCODE}`, {
        cause: e,
      });
    }
    if (match.message !== undefined) {
      if (typeof match.message === 'string') {
        if (err.message !== match.message) {
          throw new Error(
            `Expected message ${JSON.stringify(match.message)}, got ${JSON.stringify(err.message)}`,
            { cause: e },
          );
        }
      } else if (!match.message.test(err.message)) {
        throw new Error(
          `Expected message matching ${match.message}, got ${JSON.stringify(err.message)}`,
          { cause: e },
        );
      }
    }
    return err;
  }
  throw new Error(`Expected ${ErrorClass.name}, but call succeeded`);
}

export function nativeFn(env: Environment, name: string): NativeFnValue {
  const value = env.lookupVar(name);
  if (value.type !== 'native-fn') {
    throw new Error(
      `Expected ${name} to be a native function, got ${value.type}`,
    );
  }
  return value as NativeFnValue;
}

export function objectMethod(
  env: Environment,
  objectName: string,
  methodName: string,
): NativeFnValue {
  const obj = env.lookupVar(objectName) as ObjectVal;
  const method = obj.properties.get(methodName);
  if (!method || method.type !== 'native-fn') {
    throw new Error(
      `Expected ${objectName}.${methodName} to be a native function`,
    );
  }
  return method as NativeFnValue;
}

export function asNumber(value: RuntimeVal): number {
  if (value.type !== 'number') {
    throw new Error(`Expected number, got ${value.type}`);
  }
  return (value as NumberVal).value;
}

export function asString(value: RuntimeVal): string {
  if (value.type !== 'string') {
    throw new Error(`Expected string, got ${value.type}`);
  }
  return (value as StringVal).value;
}

export function asBool(value: RuntimeVal): boolean {
  if (value.type !== 'boolean') {
    throw new Error(`Expected boolean, got ${value.type}`);
  }
  return (value as BooleanVal).value;
}

export function asObject(value: RuntimeVal): ObjectVal {
  if (value.type !== 'object') {
    throw new Error(`Expected object, got ${value.type}`);
  }
  return value as ObjectVal;
}

export function asArray(value: RuntimeVal): ArrayVal {
  if (value.type !== 'array') {
    throw new Error(`Expected array, got ${value.type}`);
  }
  return value as ArrayVal;
}

/** Assert that running source throws a KinError with the given code. */
export function expectKinError(source: string, code: string): KinError {
  try {
    evaluate(source);
  } catch (e) {
    if (e instanceof KinError) {
      if (e.code !== code) {
        throw new Error(
          `Expected KinError ${code}, got ${e.code}: ${e.message}`,
          { cause: e },
        );
      }
      return e;
    }
    throw e;
  }
  throw new Error(`Expected KinError ${code}, but evaluation succeeded`);
}
