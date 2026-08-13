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
  ArrayVal,
  FunctionValue,
  ClassVal,
  InstanceVal,
  TypeVal,
  BoundMethodVal,
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

export function matchType(arg: RuntimeVal): unknown {
  switch (arg.type) {
    case 'string':
      return (arg as StringVal).value;
    case 'number':
      return (arg as NumberVal).value;
    case 'boolean':
      return (arg as BooleanVal).value ? 'nibyo' : 'sibyo';
    case 'null':
      return 'ubusa';
    case 'array': {
      const arr = arg as ArrayVal;
      const parts = arr.elements.map((el) => matchType(el));
      return `[${parts.join(', ')}]`;
    }
    case 'object': {
      const obj: { [key: string]: unknown } = {};
      const aObj = arg as ObjectVal;
      aObj.properties.forEach((value, key) => {
        obj[key] = matchType(value);
      });
      return obj;
    }
    case 'fn': {
      const fn = arg as FunctionValue;
      return {
        name: fn.name,
        body: fn.body,
        internal: false,
      };
    }
    case 'class':
      return (arg as ClassVal).name;
    case 'type':
      return (arg as TypeVal).name;
    case 'instance': {
      const inst = arg as InstanceVal;
      const fields: { [key: string]: unknown } = {};
      inst.fields.forEach((field, key) => {
        // Only surface public fields when printing from outside; still
        // show all when printing (simpler debugging). Visibility is not
        // re-checked here — print is a trusted host path.
        if (field.visibility === 'rusange') {
          fields[key] = matchType(field.value);
        }
      });
      return `${inst.classOf.name} ${JSON.stringify(fields)}`;
    }
    case 'bound-method': {
      const bm = arg as BoundMethodVal;
      return {
        name: bm.method.name,
        receiver: bm.instance.classOf.name,
        internal: false,
      };
    }
    default:
      return arg;
  }
}
