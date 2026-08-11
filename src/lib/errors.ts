/******************************************
 *              Kin Errors                *
 *   Categorized errors with name + code  *
 ******************************************/

export type KinErrorName =
  'SyntaxError' | 'TypeError' | 'ReferenceError' | 'RuntimeError';

export type KinErrorCode = 'E_SYNTAX' | 'E_TYPE' | 'E_REFERENCE' | 'E_RUNTIME';

export interface KinErrorOptions {
  line?: number;
  cause?: unknown;
}

/**
 * Base class for every Kin language error.
 *
 * `ERRNAME` is the public category (SyntaxError, TypeError, ...).
 * `ERRCODE` is a stable machine-readable code (E_SYNTAX, E_TYPE, ...).
 * Host programs and tests can distinguish errors via `instanceof`,
 * `ERRNAME`, or `ERRCODE`.
 */
export class KinError extends Error {
  readonly ERRNAME: KinErrorName;
  readonly ERRCODE: KinErrorCode;
  readonly line?: number;

  constructor(
    message: string,
    name: KinErrorName,
    code: KinErrorCode,
    options?: KinErrorOptions,
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = name;
    this.ERRNAME = name;
    this.ERRCODE = code;
    this.line = options?.line;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Node-style alias so `error.code` matches `ERRCODE`. */
  get code(): KinErrorCode {
    return this.ERRCODE;
  }
}

/** Lexer / parser failures (bad tokens, unexpected syntax). */
export class KinSyntaxError extends KinError {
  constructor(message: string, options?: KinErrorOptions) {
    super(message, 'SyntaxError', 'E_SYNTAX', options);
  }
}

/** Wrong value type or arity (bad index, non-callable, native-fn args). */
export class KinTypeError extends KinError {
  constructor(message: string, options?: KinErrorOptions) {
    super(message, 'TypeError', 'E_TYPE', options);
  }
}

/** Lookup of a name that is not in scope. */
export class KinReferenceError extends KinError {
  constructor(message: string, options?: KinErrorOptions) {
    super(message, 'ReferenceError', 'E_REFERENCE', options);
  }
}

/** Everything else that happens while running a program. */
export class KinRuntimeError extends KinError {
  constructor(message: string, options?: KinErrorOptions) {
    super(message, 'RuntimeError', 'E_RUNTIME', options);
  }
}

export function isKinError(error: unknown): error is KinError {
  return error instanceof KinError;
}

/** Format an error for the CLI / REPL. */
export function formatKinError(error: unknown): string {
  if (error instanceof KinError) {
    return `${error.ERRNAME} [${error.ERRCODE}]: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
