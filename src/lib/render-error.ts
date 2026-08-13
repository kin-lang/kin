/****************************************
 *           Error rendering            *
 *   rustc-style code frames for Kin    *
 ****************************************/

import { KinError } from './errors';
import { hasSourceRange } from './span';

export interface RenderOptions {
  /** Source text of the file (for the code frame). */
  source?: string;
  /** Path shown in the location line. */
  filename?: string;
  /** Use ANSI colours when true. Defaults to stdout being a TTY. */
  color?: boolean;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

/**
 * Format a KinError the way rustc / tsc do:
 *
 *   ikosa[K014] ReferenceError [E_REFERENCE]: <message>
 *    --> program.kin:7:11
 *     |
 *   7 |   tangaza_amakuru(izina)
 *     |                   ^^^^^
 */
export function renderKinError(
  error: KinError,
  options: RenderOptions = {},
): string {
  const useColor =
    options.color ??
    (typeof process !== 'undefined' &&
      !!process.stdout &&
      !!process.stdout.isTTY);

  const red = (s: string) => paint(useColor, '31', s);
  const bold = (s: string) => paint(useColor, '1', s);
  const cyan = (s: string) => paint(useColor, '36', s);

  const header = `${red(bold(`ikosa[${error.code}]`))} ${error.ERRNAME} [${error.ERRCODE}]: ${error.message}`;
  const lines: string[] = [header];

  const span = error.span;
  // Prefer attribution attached on the error (e.g. imported file) over entry options.
  const filename = error.filename ?? options.filename ?? 'program.kin';
  const source = error.source ?? options.source;

  if (span) {
    lines.push(` ${cyan('-->')} ${filename}:${span.line}:${span.column}`);
  }

  if (span && source && hasSourceRange(span)) {
    const sourceLines = source.split(/\r?\n/);
    const lineText = sourceLines[span.line - 1] ?? '';
    const lineNo = String(span.line);
    const gutter = ' '.repeat(lineNo.length);

    // Caret width: prefer the token/node extent on the same line.
    const lineStartOffset = (() => {
      let offset = 0;
      for (let i = 0; i < span.line - 1; i++) {
        offset += (sourceLines[i]?.length ?? 0) + 1;
      }
      return offset;
    })();
    const colStart = Math.max(1, span.column);
    const rawWidth = Math.max(1, span.end - span.start);
    // Do not let the caret run past the end of the displayed line.
    const maxWidth = Math.max(1, lineText.length - colStart + 1);
    const width = Math.min(rawWidth, maxWidth);

    lines.push(` ${gutter} ${cyan('|')}`);
    lines.push(` ${cyan(lineNo)} ${cyan('|')} ${lineText}`);
    lines.push(
      ` ${gutter} ${cyan('|')} ${' '.repeat(colStart - 1)}${red('^'.repeat(width))}`,
    );

    // Silence unused when span has no line content (kept for clarity).
    void lineStartOffset;
  }

  return lines.join('\n');
}

/** Format any thrown value for the CLI. */
export function renderThrown(
  error: unknown,
  options: RenderOptions = {},
): string {
  if (error instanceof KinError) {
    return renderKinError(error, options);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
