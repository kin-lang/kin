/********************************************************************************
 *                         Run a Kin source string                              *
 *   Single entry that keeps parser type-safety mode in sync with the env       *
 ********************************************************************************/

import Parser, { Diagnostic, ParseResult } from '../parser/parser';
import { Interpreter } from './interpreter';
import { createGlobalEnv } from './globals';
import Environment from './environment';
import { RuntimeVal } from './values';
import { TypeSafetyMode } from './types';

export interface RunSourceOptions {
  filename?: string;
  /** CLI / host override: on | off | strict */
  typeSafety?: string | null;
  /**
   * When true (default), throw the first diagnostic instead of returning them.
   * Set false to get ParseResult-style diagnostics without evaluating on error.
   */
  throwOnDiagnostic?: boolean;
}

export interface RunSourceResult {
  result: RuntimeVal;
  env: Environment;
  typeSafety: TypeSafetyMode;
  diagnostics: Diagnostic[];
  program: ParseResult['program'];
}

/**
 * Parse and evaluate source with a single resolved type-safety mode shared
 * by the parser (strict annotations) and the environment (runtime checks).
 *
 * Prefer this over calling produceAST + createGlobalEnv separately so
 * `# kin-types:` / `KIN_TYPES` / overrides cannot drift between the two.
 */
export function runSource(
  source: string,
  options: RunSourceOptions = {},
): RunSourceResult {
  const filename = options.filename ?? 'program.kin';
  const throwOnDiagnostic = options.throwOnDiagnostic !== false;

  const parser = new Parser();
  if (options.typeSafety !== undefined) {
    parser.setTypeSafetyOverride(options.typeSafety);
  }

  const { program, diagnostics, typeSafety } = parser.parse(source);

  if (diagnostics.length > 0 && throwOnDiagnostic) {
    throw diagnostics[0].error;
  }

  const env = createGlobalEnv(filename, { typeSafety });

  if (diagnostics.length > 0) {
    return {
      result: env.lookupVar('ubusa'),
      env,
      typeSafety,
      diagnostics,
      program,
    };
  }

  const result = Interpreter.evaluate(program, env);
  return { result, env, typeSafety, diagnostics, program };
}

/**
 * Apply a newly parsed line's type-safety mode onto an existing env
 * (used by the REPL so `# kin-types:` takes effect without wiping bindings).
 */
export function applyTypeSafetyToEnv(
  env: Environment,
  typeSafety: TypeSafetyMode,
): void {
  env.setTypeSafety(typeSafety);
}
