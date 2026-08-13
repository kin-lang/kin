/****************************************
 *              KinError                *
 *  Categories, stable codes, spans     *
 ****************************************/

import { Span } from './span';
import { formatMessage, MessageCode } from './messages';

export type { MessageCode };

/** Public error category (ERRNAME). */
export type KinErrorName =
  'SyntaxError' | 'TypeError' | 'ReferenceError' | 'RuntimeError';

/** Machine-readable category code (ERRCODE). */
export type KinErrorCategoryCode =
  'E_SYNTAX' | 'E_TYPE' | 'E_REFERENCE' | 'E_RUNTIME';

/** @deprecated Prefer KinErrorCategoryCode; kept as a short alias for hosts. */
export type KinErrorCode = KinErrorCategoryCode;

const CATEGORY_META: Record<
  KinErrorName,
  { ERRNAME: KinErrorName; ERRCODE: KinErrorCategoryCode }
> = {
  SyntaxError: { ERRNAME: 'SyntaxError', ERRCODE: 'E_SYNTAX' },
  TypeError: { ERRNAME: 'TypeError', ERRCODE: 'E_TYPE' },
  ReferenceError: { ERRNAME: 'ReferenceError', ERRCODE: 'E_REFERENCE' },
  RuntimeError: { ERRNAME: 'RuntimeError', ERRCODE: 'E_RUNTIME' },
};

/**
 * Map each stable K0xx message code to a category.
 * Unknown codes default to RuntimeError.
 */
export const CODE_CATEGORY: Readonly<Record<string, KinErrorName>> = {
  // Syntax — lexer / parser
  K001: 'SyntaxError',
  K002: 'SyntaxError',
  K003: 'SyntaxError',
  K004: 'SyntaxError',
  K020: 'SyntaxError',
  K021: 'SyntaxError',
  K022: 'SyntaxError',
  K023: 'SyntaxError',
  K030: 'SyntaxError',
  K031: 'SyntaxError',
  K032: 'SyntaxError',

  // Reference — names / bindings
  K005: 'ReferenceError',
  K006: 'ReferenceError',
  K007: 'ReferenceError',

  // Type — values, arity, operators, indexes, annotations
  K008: 'TypeError',
  K009: 'TypeError',
  K010: 'TypeError',
  K011: 'TypeError',
  K012: 'TypeError',
  K016: 'TypeError',
  K017: 'TypeError',
  K018: 'TypeError',
  K024: 'TypeError',
  K033: 'TypeError',
  K034: 'TypeError',
  K035: 'TypeError',
  K036: 'TypeError',

  // Runtime — control flow, exit, internals
  K013: 'RuntimeError',
  K014: 'RuntimeError',
  K015: 'RuntimeError',
  K019: 'RuntimeError',
  K025: 'RuntimeError',
  K026: 'RuntimeError',
  K027: 'RuntimeError',
  K028: 'RuntimeError',
  K029: 'RuntimeError',
};

export function categoryForCode(code: string): KinErrorName {
  return CODE_CATEGORY[code] ?? 'RuntimeError';
}

export interface KinErrorOptions {
  span?: Span;
  params?: Record<string, string | number>;
  cause?: unknown;
  /** Override the resolved message (rare; prefer catalog keys). */
  message?: string;
}

/**
 * Language error with:
 * - `code` — stable detail code (K001, ...)
 * - `ERRNAME` / `ERRCODE` — category for host programs and tests
 * - optional source `span` and interpolation `params`
 *
 * Prefer `createKinError` / `kinError` so the correct subclass is used.
 */
export class KinError extends Error {
  readonly code: string;
  readonly ERRNAME: KinErrorName;
  readonly ERRCODE: KinErrorCategoryCode;
  readonly span?: Span;
  readonly params: Record<string, string | number>;

  constructor(
    code: string,
    options: KinErrorOptions = {},
    category?: KinErrorName,
  ) {
    const params = options.params ?? {};
    const message = options.message ?? formatMessage(code, params);
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    const cat = category ?? categoryForCode(code);
    const meta = CATEGORY_META[cat];
    this.name = meta.ERRNAME;
    this.ERRNAME = meta.ERRNAME;
    this.ERRCODE = meta.ERRCODE;
    this.code = code;
    this.span = options.span;
    this.params = params;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Lexer / parser failures (bad tokens, unexpected syntax). */
export class KinSyntaxError extends KinError {
  constructor(code: string, options: KinErrorOptions = {}) {
    super(code, options, 'SyntaxError');
  }
}

/** Wrong value type, arity, operator, or index. */
export class KinTypeError extends KinError {
  constructor(code: string, options: KinErrorOptions = {}) {
    super(code, options, 'TypeError');
  }
}

/** Lookup or rebinding of a name that is invalid in this scope. */
export class KinReferenceError extends KinError {
  constructor(code: string, options: KinErrorOptions = {}) {
    super(code, options, 'ReferenceError');
  }
}

/** Control-flow faults and other runtime failures. */
export class KinRuntimeError extends KinError {
  constructor(code: string, options: KinErrorOptions = {}) {
    super(code, options, 'RuntimeError');
  }
}

/** Build the subclass matching the message code's category. */
export function createKinError(
  code: string,
  options: KinErrorOptions = {},
): KinError {
  switch (categoryForCode(code)) {
    case 'SyntaxError':
      return new KinSyntaxError(code, options);
    case 'TypeError':
      return new KinTypeError(code, options);
    case 'ReferenceError':
      return new KinReferenceError(code, options);
    case 'RuntimeError':
    default:
      return new KinRuntimeError(code, options);
  }
}

export function isKinError(error: unknown): error is KinError {
  return error instanceof KinError;
}

export function isKinSyntaxError(error: unknown): error is KinSyntaxError {
  return error instanceof KinSyntaxError;
}

export function isKinTypeError(error: unknown): error is KinTypeError {
  return error instanceof KinTypeError;
}

export function isKinReferenceError(
  error: unknown,
): error is KinReferenceError {
  return error instanceof KinReferenceError;
}

export function isKinRuntimeError(error: unknown): error is KinRuntimeError {
  return error instanceof KinRuntimeError;
}

/** Convenience: throw a categorized KinError. */
export function kinError(code: string, options: KinErrorOptions = {}): never {
  throw createKinError(code, options);
}

/**
 * Compact one-line format for host programs:
 * `ReferenceError [E_REFERENCE] K005: ...`
 */
export function formatKinError(error: unknown): string {
  if (error instanceof KinError) {
    return `${error.ERRNAME} [${error.ERRCODE}] ${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
