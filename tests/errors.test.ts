import { describe, expect, test } from 'vitest';
import Lexer from '../src/lexer/lexer';
import Parser from '../src/parser/parser';
import {
  CODE_CATEGORY,
  KinError,
  KinReferenceError,
  KinRuntimeError,
  KinSyntaxError,
  KinTypeError,
  categoryForCode,
  createKinError,
  formatKinError,
  isKinError,
  isKinReferenceError,
  isKinRuntimeError,
  isKinSyntaxError,
  isKinTypeError,
} from '../src/lib/errors';
import { evaluate, expectKinError, expectThrownKinError } from './helpers';
import { renderKinError } from '../src/lib/render-error';

describe('Kin error taxonomy', () => {
  test('each class exposes stable ERRNAME, ERRCODE, and detail code', () => {
    const syntax = new KinSyntaxError('K001');
    const type = new KinTypeError('K012');
    const reference = new KinReferenceError('K005');
    const runtime = new KinRuntimeError('K014');

    expect(syntax).toBeInstanceOf(KinError);
    expect(syntax).toBeInstanceOf(Error);
    expect(syntax.ERRNAME).toBe('SyntaxError');
    expect(syntax.ERRCODE).toBe('E_SYNTAX');
    expect(syntax.code).toBe('K001');
    expect(syntax.name).toBe('SyntaxError');

    expect(type.ERRNAME).toBe('TypeError');
    expect(type.ERRCODE).toBe('E_TYPE');
    expect(type.code).toBe('K012');

    expect(reference.ERRNAME).toBe('ReferenceError');
    expect(reference.ERRCODE).toBe('E_REFERENCE');

    expect(runtime.ERRNAME).toBe('RuntimeError');
    expect(runtime.ERRCODE).toBe('E_RUNTIME');
  });

  test('categories are distinguishable by class, name, and code', () => {
    const syntax = createKinError('K004');
    const type = createKinError('K010');

    expect(syntax).toBeInstanceOf(KinSyntaxError);
    expect(type).toBeInstanceOf(KinTypeError);
    expect(syntax).not.toBeInstanceOf(KinTypeError);
    expect(type).not.toBeInstanceOf(KinSyntaxError);
    expect(syntax.ERRNAME).not.toBe(type.ERRNAME);
    expect(syntax.ERRCODE).not.toBe(type.ERRCODE);
    expect(isKinError(syntax)).toBe(true);
    expect(isKinSyntaxError(syntax)).toBe(true);
    expect(isKinTypeError(type)).toBe(true);
    expect(isKinError(new Error('host'))).toBe(false);
  });

  test('createKinError picks the subclass from the message code', () => {
    expect(createKinError('K003')).toBeInstanceOf(KinSyntaxError);
    expect(createKinError('K005')).toBeInstanceOf(KinReferenceError);
    expect(createKinError('K012')).toBeInstanceOf(KinTypeError);
    expect(createKinError('K015')).toBeInstanceOf(KinRuntimeError);
    expect(isKinReferenceError(createKinError('K007'))).toBe(true);
    expect(isKinRuntimeError(createKinError('K019'))).toBe(true);
  });

  test('every catalogued code maps to a category', () => {
    for (const code of Object.keys(CODE_CATEGORY)) {
      const err = createKinError(code);
      expect(err.ERRNAME).toBe(CODE_CATEGORY[code]);
      expect(categoryForCode(code)).toBe(CODE_CATEGORY[code]);
    }
  });

  test('formatKinError prints ERRNAME, ERRCODE, and detail code', () => {
    const prev = process.env.KIN_LANG;
    process.env.KIN_LANG = 'en';
    try {
      const err = createKinError('K009', { params: { type: 'null' } });
      expect(formatKinError(err)).toBe(
        'TypeError [E_TYPE] K009: Cannot use null as an index or key',
      );
      expect(formatKinError(new Error('plain'))).toBe('plain');
      expect(formatKinError('stringy')).toBe('stringy');
    } finally {
      if (prev === undefined) delete process.env.KIN_LANG;
      else process.env.KIN_LANG = prev;
    }
  });

  test('KinTypeError is not the host TypeError', () => {
    const err = new KinTypeError('K010');
    expect(err).toBeInstanceOf(KinTypeError);
    expect(err).not.toBeInstanceOf(TypeError);
  });

  test('renderer includes category next to the detail code', () => {
    const prev = process.env.KIN_LANG;
    process.env.KIN_LANG = 'en';
    try {
      const err = createKinError('K005', {
        params: { name: 'c' },
        span: { start: 16, end: 17, line: 1, column: 17 },
      });
      const rendered = renderKinError(err, {
        source: 'tangaza_amakuru(c)',
        filename: 'program.kin',
        color: false,
      });
      expect(rendered).toContain('ikosa[K005]');
      expect(rendered).toContain('ReferenceError [E_REFERENCE]');
      expect(rendered).toContain('program.kin:1:17');
    } finally {
      if (prev === undefined) delete process.env.KIN_LANG;
      else process.env.KIN_LANG = prev;
    }
  });
});

describe('Lexer throws KinSyntaxError', () => {
  test('unexpected character', () => {
    const err = expectThrownKinError(
      () => new Lexer('let x = ~;').tokenize(),
      KinSyntaxError,
      {
        code: 'K004',
        ERRNAME: 'SyntaxError',
        ERRCODE: 'E_SYNTAX',
      },
    );
    expect(err).toBeInstanceOf(KinSyntaxError);
    expect(err.code).toBe('K004');
  });

  test('unterminated string', () => {
    const err = expectThrownKinError(
      () => new Lexer('"hello').tokenize(),
      KinSyntaxError,
      {
        code: 'K003',
        ERRNAME: 'SyntaxError',
        ERRCODE: 'E_SYNTAX',
      },
    );
    expect(err).toBeInstanceOf(KinSyntaxError);
    expect(err.code).toBe('K003');
  });

  test('lone pipe', () => {
    const err = expectThrownKinError(
      () => new Lexer('a | b').tokenize(),
      KinSyntaxError,
      {
        code: 'K004',
        ERRNAME: 'SyntaxError',
        ERRCODE: 'E_SYNTAX',
      },
    );
    expect(err).toBeInstanceOf(KinSyntaxError);
  });
});

describe('Parser throws KinSyntaxError', () => {
  test('unexpected token in expression', () => {
    const parser = new Parser();
    const err = expectThrownKinError(
      () => parser.produceAST('reka x = ;'),
      KinSyntaxError,
      {
        ERRNAME: 'SyntaxError',
        ERRCODE: 'E_SYNTAX',
      },
    );
    expect(err).toBeInstanceOf(KinSyntaxError);
    expect(err.ERRCODE).toBe('E_SYNTAX');
  });

  test('constant without a value', () => {
    const parser = new Parser();
    const err = expectThrownKinError(
      () => parser.produceAST('ntahinduka x;'),
      KinSyntaxError,
      {
        code: 'K020',
        ERRNAME: 'SyntaxError',
        ERRCODE: 'E_SYNTAX',
      },
    );
    expect(err).toBeInstanceOf(KinSyntaxError);
    expect(err.code).toBe('K020');
  });

  test('parse diagnostics are categorized syntax errors', () => {
    const parser = new Parser();
    const { diagnostics } = parser.parse('reka = 1');
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    for (const d of diagnostics) {
      expect(d.error).toBeInstanceOf(KinSyntaxError);
      expect(d.error.ERRCODE).toBe('E_SYNTAX');
    }
  });
});

describe('Runtime throws categorized Kin errors', () => {
  test('undefined variable is a ReferenceError', () => {
    const err = expectKinError('ntabwo_iriho', 'K005');
    expect(err).toBeInstanceOf(KinReferenceError);
    expect(err.ERRNAME).toBe('ReferenceError');
    expect(err.ERRCODE).toBe('E_REFERENCE');
  });

  test('bad index type is a TypeError', () => {
    const err = expectKinError(
      `
        reka a = [1]
        a[ubusa]
      `,
      'K009',
    );
    expect(err).toBeInstanceOf(KinTypeError);
    expect(err.ERRNAME).toBe('TypeError');
    expect(err.ERRCODE).toBe('E_TYPE');
  });

  test('calling a non-function is a TypeError', () => {
    const err = expectKinError(
      `
        reka x = 1
        x()
      `,
      'K010',
    );
    expect(err).toBeInstanceOf(KinTypeError);
  });

  test('operator type mismatch is a TypeError', () => {
    const err = expectKinError('tangaza_amakuru(nibyo + 1)', 'K012');
    expect(err).toBeInstanceOf(KinTypeError);
    expect(err.ERRCODE).toBe('E_TYPE');
  });

  test('array out of range is a TypeError', () => {
    const err = expectKinError(
      `
        reka a = [1]
        a[9]
      `,
      'K016',
    );
    expect(err).toBeInstanceOf(KinTypeError);
  });

  test('stray hagarara is a RuntimeError', () => {
    const err = expectKinError('hagarara', 'K014');
    expect(err).toBeInstanceOf(KinRuntimeError);
    expect(err.ERRNAME).toBe('RuntimeError');
    expect(err.ERRCODE).toBe('E_RUNTIME');
  });

  test('stray tanga is a RuntimeError', () => {
    const err = expectKinError('tanga 1', 'K015');
    expect(err).toBeInstanceOf(KinRuntimeError);
  });

  test('reassigning a constant is a ReferenceError', () => {
    const err = expectKinError(
      `
        ntahinduka x = 1
        x = 2
      `,
      'K006',
    );
    expect(err).toBeInstanceOf(KinReferenceError);
  });

  test('redeclaration is a ReferenceError', () => {
    const err = expectKinError(
      `
        reka x = 1
        reka x = 2
      `,
      'K007',
    );
    expect(err).toBeInstanceOf(KinReferenceError);
  });

  test('property access on a number is a TypeError', () => {
    const err = expectKinError(
      `
        reka n = 1
        n.foo
      `,
      'K008',
    );
    expect(err).toBeInstanceOf(KinTypeError);
  });

  test('evaluation still returns values when no error is thrown', () => {
    const { result } = evaluate('reka x = 1 + 2\nx');
    expect(result.type).toBe('number');
  });
});
