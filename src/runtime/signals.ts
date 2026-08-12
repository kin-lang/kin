/****************************************
 *              Signals                 *
 *   Control-flow exceptions            *
 ****************************************/

import { RuntimeVal } from './values';

/**
 * Thrown by `tanga` to leave a function. Caught only by eval_call_expr.
 * Carries the return value.
 */
export class ReturnSignal {
  readonly value: RuntimeVal;
  constructor(value: RuntimeVal) {
    this.value = value;
  }
}

/**
 * Thrown by `hagarara` to leave the innermost loop.
 * Caught by eval_loop_statement. Must not escape a function.
 */
export class BreakSignal {}

/**
 * Thrown by `komeza` to skip to the next loop iteration.
 * Caught by eval_loop_statement. Must not escape a function.
 */
export class ContinueSignal {}

export function isReturnSignal(e: unknown): e is ReturnSignal {
  return e instanceof ReturnSignal;
}

export function isBreakSignal(e: unknown): e is BreakSignal {
  return e instanceof BreakSignal;
}

export function isContinueSignal(e: unknown): e is ContinueSignal {
  return e instanceof ContinueSignal;
}

export function isControlSignal(
  e: unknown,
): e is ReturnSignal | BreakSignal | ContinueSignal {
  return (
    e instanceof ReturnSignal ||
    e instanceof BreakSignal ||
    e instanceof ContinueSignal
  );
}
