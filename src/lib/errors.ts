/****************************************
 *              KinError                *
 *   Stable codes, spans, and params    *
 ****************************************/

import { Span } from './span';
import { formatMessage, MessageCode } from './messages';

export type { MessageCode };

export interface KinErrorOptions {
  span?: Span;
  params?: Record<string, string | number>;
  cause?: unknown;
  /** Override the resolved message (rare; prefer catalog keys). */
  message?: string;
}

/**
 * Language error with a stable code (K001, ...) and optional source span.
 * The CLI and tests should key off `code` rather than the human message.
 */
export class KinError extends Error {
  readonly code: string;
  readonly span?: Span;
  readonly params: Record<string, string | number>;

  constructor(code: string, options: KinErrorOptions = {}) {
    const params = options.params ?? {};
    const message = options.message ?? formatMessage(code, params);
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = 'KinError';
    this.code = code;
    this.span = options.span;
    this.params = params;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isKinError(error: unknown): error is KinError {
  return error instanceof KinError;
}

/** Convenience: throw a KinError. */
export function kinError(code: string, options: KinErrorOptions = {}): never {
  throw new KinError(code, options);
}
