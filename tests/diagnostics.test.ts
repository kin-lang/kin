import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';
import { KinError } from '../src/lib/errors';
import { evaluate, expectKinError } from './helpers';
import { renderKinError } from '../src/lib/render-error';

describe('diagnostics', () => {
  test('undefined variable reports code, line and column', () => {
    const source = 'tangaza_amakuru(c)';
    let thrown: unknown;
    try {
      evaluate(source);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(KinError);
    const err = thrown as KinError;
    expect(err.code).toBe('K005');
    expect(err.span).toBeDefined();
    expect(err.span!.line).toBe(1);
    // c starts after "tangaza_amakuru("
    expect(err.span!.column).toBeGreaterThan(1);

    const rendered = renderKinError(err, {
      source,
      filename: 'program.kin',
      color: false,
    });
    expect(rendered).toContain('ikosa[K005]');
    expect(rendered).toContain('program.kin:1:');
    expect(rendered).toMatch(/\^+/);
  });

  test('parse() collects multiple syntax errors', () => {
    // Three independent bad statements.
    const source = `
      reka = 1
      niba {
      porogaramu_ntoya () {}
    `;
    const parser = new Parser();
    const { diagnostics } = parser.parse(source);
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    for (const d of diagnostics) {
      expect(d.severity).toBe('error');
      expect(d.error).toBeInstanceOf(KinError);
      expect(d.error.code).toMatch(/^K0/);
      expect(d.error.span).toBeDefined();
    }
  });

  test('produceAST still throws on the first error (back-compat)', () => {
    const parser = new Parser();
    expect(() => parser.produceAST('reka = 1')).toThrow(KinError);
  });

  test('KIN_LANG=en produces English messages', () => {
    const prev = process.env.KIN_LANG;
    process.env.KIN_LANG = 'en';
    try {
      const err = expectKinError('tangaza_amakuru(missing_name)', 'K005');
      expect(err.message).toMatch(/Cannot resolve/);
      expect(err.message).not.toMatch(/^TODO\(rw\):/);
    } finally {
      if (prev === undefined) delete process.env.KIN_LANG;
      else process.env.KIN_LANG = prev;
    }
  });

  test('operator type error has a stable code', () => {
    const err = expectKinError('tangaza_amakuru(nibyo + 1)', 'K012');
    expect(err.params.op).toBe('+');
  });

  test('array out of range has code K016', () => {
    const err = expectKinError(
      `
        reka a = [1, 2]
        a[9]
      `,
      'K016',
    );
    expect(err.params.index).toBe('9');
  });
});
