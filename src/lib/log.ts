/****************************************
 *                  Log                 *
 *      utility for logging messages    *
 ****************************************/

import { KinErrorOptions, createKinError } from './errors';

export const LogMessage = console.log;

/**
 * Throw a plain Error. Prefer KinError / kinError for language faults so
 * the CLI can render codes and spans. Callers must NOT prefix "Kin Error:"
 * here; the renderer or CLI adds presentation once.
 */
export const LogError = (...args: unknown[]): never => {
  const message = args.map((arg) => String(arg)).join(' ');
  throw new Error(message);
};

/** Throw a KinError with a stable code (preferred over LogError). */
export function LogKinError(
  code: string,
  options: KinErrorOptions = {},
): never {
  throw createKinError(code, options);
}
