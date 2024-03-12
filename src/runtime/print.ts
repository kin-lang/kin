/********************************************************************
 *                        print values                              *
 *          Whenever we want to write something to the console      *
 ********************************************************************/

import {
  RuntimeVal,
  StringVal,
  NumberVal,
  BooleanVal,
  ObjectVal,
  FunctionValue,
  MK_STRING,
} from './values';

import { LogMessage } from '../lib/log';

export function printValues(args: Array<RuntimeVal>) {
  let output = '';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    output += matchType(arg);
  }
  LogMessage(output);
}

// Utility for injiza_amakuru(), helps injiza_amakuru() to have multiple arguments
export function makeValues(args: Array<RuntimeVal>) {
  let output = '';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    output += matchType(arg);
  }
  return MK_STRING(output);
}

export function matchType(arg: RuntimeVal) {
  switch (arg.type) {
    case 'string':
      return (arg as StringVal).value;
    case 'number':
      return (arg as NumberVal).value;
    case 'boolean':
      (arg as BooleanVal).value ? 'nibyo' : 'sibyo';
    case 'null':
      return 'ubusa';
    case 'object':
      const obj: { [key: string]: unknown } = {};
      const aObj = arg as ObjectVal;
      aObj.properties.forEach((value, key) => {
        obj[key] = matchType(value);
      });

      return obj;
    case 'fn':
      const fn = arg as FunctionValue;

      return {
        name: fn.name,
        body: fn.body,
        internal: false,
      };
    default:
      return arg;
  }
}
