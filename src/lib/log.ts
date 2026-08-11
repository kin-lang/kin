/****************************************
 *                  Log                 *
 *      utility for loggin messages     *
 ****************************************/

import { KinRuntimeError, KinTypeError } from './errors';

export const LogMessage = console.log;

/** Throw a generic runtime error. Prefer a specific Kin*Error when the category is known. */
export const LogError = (...args: unknown[]): never => {
  const message = args.map((arg) => String(arg)).join(' ');
  throw new KinRuntimeError(message);
};

/** Throw a TypeError — used by native builtins for arity/type checks. */
export const LogTypeError = (...args: unknown[]): never => {
  const message = args.map((arg) => String(arg)).join(' ');
  throw new KinTypeError(message);
};
