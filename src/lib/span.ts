/****************************************
 *                 Span                 *
 *   Source location for tokens / AST   *
 ****************************************/

/** Character range and start position of a token or AST node. */
export interface Span {
  /** Inclusive start offset in the source string. */
  start: number;
  /** Exclusive end offset in the source string. */
  end: number;
  /** 1-based line of the start position. */
  line: number;
  /** 1-based column of the start position. */
  column: number;
}

/** A zero-width span used when no better location is known. */
export function emptySpan(line = 1, column = 1): Span {
  return { start: 0, end: 0, line, column };
}

/** Build a span covering from the start of `a` to the end of `b`. */
export function mergeSpans(a: Span, b: Span): Span {
  return {
    start: a.start,
    end: b.end,
    line: a.line,
    column: a.column,
  };
}

/** True when the span has a non-empty source range. */
export function hasSourceRange(span: Span | undefined): span is Span {
  return span !== undefined && span.end > span.start;
}
