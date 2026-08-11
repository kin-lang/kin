/*************************************************************************************************************
 *                                                   Validator                                               *
 *             Utility for validating native function arguments before they are executed                     *
 *************************************************************************************************************/
import { LogError } from './log';

export class Validator {
  static requireMinArgs(fnName: string, actual: number, min: number): void {
    if (actual < min) {
      const noun = min === 1 ? 'argument' : 'arguments';
      LogError(`${fnName} expects at least ${min} ${noun}`);
    }
  }

  static requireExactArgs(
    fnName: string,
    actual: number,
    expected: number,
  ): void {
    if (actual !== expected) {
      const noun = expected === 1 ? 'argument' : 'arguments';
      LogError(`${fnName} expects ${expected} ${noun}`);
    }
  }
}
