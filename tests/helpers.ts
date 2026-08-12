import Parser from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { createGlobalEnv } from '../src/runtime/globals';
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

export function evaluate(
  sourceCode: string,
  filename = 'test.kin',
): { result: RuntimeVal; env: Environment } {
  const parser = new Parser();
  const ast = parser.produceAST(sourceCode);
  const env = createGlobalEnv(filename);
  const result = Interpreter.evaluate(ast, env);
  return { result, env };
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
