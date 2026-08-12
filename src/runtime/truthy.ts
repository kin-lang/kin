/****************************************
 *              Truthiness              *
 *   Used by niba and subiramo_niba     *
 ****************************************/

import { BooleanVal, NumberVal, RuntimeVal } from './values';

/**
 * Truthiness rule (documented in grammar.bnf and README):
 *   false:  sibyo, ubusa, and the number 0
 *   true:   everything else (including empty strings and empty arrays)
 */
export function isTruthy(value: RuntimeVal): boolean {
  switch (value.type) {
    case 'boolean':
      return (value as BooleanVal).value;
    case 'null':
      return false;
    case 'number':
      return (value as NumberVal).value !== 0;
    default:
      return true;
  }
}
