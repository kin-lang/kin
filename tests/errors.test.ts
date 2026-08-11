import { describe, expect, test } from 'vitest';
import Lexer from '../src/lexer/lexer';
import Parser from '../src/parser/parser';
import {
  KinError,
  KinReferenceError,
  KinRuntimeError,
  KinSyntaxError,
  KinTypeError,
  formatKinError,
  isKinError,
} from '../src/lib/errors';
import { evaluate, expectKinError } from './helpers';

describe('Kin error taxonomy', () => {
  test('each class exposes a stable ERRNAME and ERRCODE', () => {
    const syntax = new KinSyntaxError('bad token');
    const type = new KinTypeError('bad type');
    const reference = new KinReferenceError('missing name');
    const runtime = new KinRuntimeError('boom');

    expect(syntax).toBeInstanceOf(KinError);
    expect(syntax).toBeInstanceOf(Error);
    expect(syntax.ERRNAME).toBe('SyntaxError');
    expect(syntax.ERRCODE).toBe('E_SYNTAX');
    expect(syntax.code).toBe('E_SYNTAX');
    expect(syntax.name).toBe('SyntaxError');

    expect(type.ERRNAME).toBe('TypeError');
    expect(type.ERRCODE).toBe('E_TYPE');

    expect(reference.ERRNAME).toBe('ReferenceError');
    expect(reference.ERRCODE).toBe('E_REFERENCE');

    expect(runtime.ERRNAME).toBe('RuntimeError');
    expect(runtime.ERRCODE).toBe('E_RUNTIME');
  });

  test('categories are distinguishable by class, name, and code', () => {
    const syntax = new KinSyntaxError('x');
    const type = new KinTypeError('x');

    expect(syntax).not.toBeInstanceOf(KinTypeError);
    expect(type).not.toBeInstanceOf(KinSyntaxError);
    expect(syntax.ERRNAME).not.toBe(type.ERRNAME);
    expect(syntax.ERRCODE).not.toBe(type.ERRCODE);
    expect(isKinError(syntax)).toBe(true);
    expect(isKinError(new Error('host'))).toBe(false);
  });

  test('formatKinError prints ERRNAME and ERRCODE', () => {
    expect(
      formatKinError(new KinTypeError('Cannot use null as an index/key')),
    ).toBe('TypeError [E_TYPE]: Cannot use null as an index/key');
    expect(formatKinError(new Error('plain'))).toBe('plain');
    expect(formatKinError('stringy')).toBe('stringy');
  });

  test('KinTypeError is not the host TypeError', () => {
    const err = new KinTypeError('kin');
    expect(err).toBeInstanceOf(KinTypeError);
    expect(err).not.toBeInstanceOf(TypeError);
  });
});

describe('Lexer throws KinSyntaxError', () => {
  test('unexpected character', () => {
    expectKinError(() => new Lexer('let x = ~;').tokenize(), KinSyntaxError, {
      ERRNAME: 'SyntaxError',
      ERRCODE: 'E_SYNTAX',
      message: "Unexpected character '~' at line 1",
    });
  });

  test('unterminated string', () => {
    expectKinError(() => new Lexer('"hello').tokenize(), KinSyntaxError, {
      ERRNAME: 'SyntaxError',
      ERRCODE: 'E_SYNTAX',
      message: 'Unterminated string literal at line 1',
    });
  });

  test('lone pipe', () => {
    expectKinError(() => new Lexer('a | b').tokenize(), KinSyntaxError, {
      ERRNAME: 'SyntaxError',
      ERRCODE: 'E_SYNTAX',
      message: "Unexpected character '|' at line 1",
    });
  });
});

describe('Parser throws KinSyntaxError', () => {
  test('unexpected token in expression', () => {
    const parser = new Parser();
    expectKinError(() => parser.produceAST('reka x = ;'), KinSyntaxError, {
      ERRNAME: 'SyntaxError',
      ERRCODE: 'E_SYNTAX',
    });
  });

  test('constant without a value', () => {
    const parser = new Parser();
    expectKinError(() => parser.produceAST('ntahinduka x;'), KinSyntaxError, {
      ERRNAME: 'SyntaxError',
      ERRCODE: 'E_SYNTAX',
      message: 'Constant variables must be assigned a value',
    });
  });
});

describe('Runtime throws categorized Kin errors', () => {
  test('undefined variable is a ReferenceError', () => {
    expectKinError(() => evaluate('ntabwo_iriho'), KinReferenceError, {
      ERRNAME: 'ReferenceError',
      ERRCODE: 'E_REFERENCE',
      message: "Cannot resolve 'ntabwo_iriho' as it does not exist.",
    });
  });

  test('bad index type is a TypeError', () => {
    expectKinError(
      () =>
        evaluate(`
          reka arr = [1, 2]
          arr[ubusa]
        `),
      KinTypeError,
      {
        ERRNAME: 'TypeError',
        ERRCODE: 'E_TYPE',
        message: 'Cannot use null as an index/key',
      },
    );
  });

  test('property access on a primitive is a TypeError', () => {
    expectKinError(
      () =>
        evaluate(`
          reka x = 5
          x.foo
        `),
      KinTypeError,
      {
        ERRNAME: 'TypeError',
        ERRCODE: 'E_TYPE',
        message: "Cannot access property 'foo' of number",
      },
    );
  });

  test('calling a non-function is a TypeError', () => {
    expectKinError(
      () =>
        evaluate(`
          reka x = 1
          x()
        `),
      KinTypeError,
      {
        ERRNAME: 'TypeError',
        ERRCODE: 'E_TYPE',
        message: 'Cannot call value that is not a function',
      },
    );
  });

  test('wrong function arity is a TypeError', () => {
    expectKinError(
      () =>
        evaluate(`
          porogaramu_ntoya f(a, b) {
            tanga a
          }
          f(1)
        `),
      KinTypeError,
      {
        ERRNAME: 'TypeError',
        ERRCODE: 'E_TYPE',
        message:
          "number of function's arguments must equal to it's the parameters",
      },
    );
  });

  test('native-fn arity/type checks are TypeErrors', () => {
    expectKinError(() => evaluate('ubwoko()'), KinTypeError, {
      ERRNAME: 'TypeError',
      ERRCODE: 'E_TYPE',
      message: 'ubwoko expects at least one argument',
    });
    expectKinError(() => evaluate('KIN_AMAGAMBO.ingano(12)'), KinTypeError, {
      ERRNAME: 'TypeError',
      ERRCODE: 'E_TYPE',
      message: 'KIN_AMAGAMBO.ingano expects string as an argument',
    });
  });

  test('redeclaring a variable is a RuntimeError', () => {
    expectKinError(
      () =>
        evaluate(`
          reka x = 1
          reka x = 2
        `),
      KinRuntimeError,
      {
        ERRNAME: 'RuntimeError',
        ERRCODE: 'E_RUNTIME',
        message: 'Cannot declare variable x. As it already is defined.',
      },
    );
  });

  test('reassigning a constant is a RuntimeError', () => {
    expectKinError(
      () =>
        evaluate(`
          ntahinduka x = 1
          x = 2
        `),
      KinRuntimeError,
      {
        ERRNAME: 'RuntimeError',
        ERRCODE: 'E_RUNTIME',
        message: 'Cannot reassign to variable "x" as it\'s constant.',
      },
    );
  });
});

describe('catch can distinguish Kin error categories', () => {
  test('a host catch can branch on ERRCODE', () => {
    const seen: string[] = [];

    const cases: Array<() => unknown> = [
      () => new Lexer('~').tokenize(),
      () => evaluate('ntabwo_iriho'),
      () => evaluate('ubusa.foo'),
      () =>
        evaluate(`
          reka x = 1
          reka x = 2
        `),
    ];

    for (const run of cases) {
      try {
        run();
      } catch (error) {
        if (!isKinError(error)) {
          throw error;
        }
        switch (error.ERRCODE) {
          case 'E_SYNTAX':
            seen.push(error.ERRNAME);
            break;
          case 'E_REFERENCE':
            seen.push(error.ERRNAME);
            break;
          case 'E_TYPE':
            seen.push(error.ERRNAME);
            break;
          case 'E_RUNTIME':
            seen.push(error.ERRNAME);
            break;
        }
      }
    }

    expect(seen).toEqual([
      'SyntaxError',
      'ReferenceError',
      'TypeError',
      'RuntimeError',
    ]);
  });
});
