#!/usr/bin/env node

import { program } from 'commander';
import pkg from '../package.json';
import { readFile } from 'fs/promises';
import {
  Interpreter,
  Parser,
  applyTypeSafetyToEnv,
  createGlobalEnv,
  isKinError,
  normalizeTypeSafetyMode,
  renderThrown,
  runSource,
} from '../src/index';
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function useColor(): boolean {
  return !!process.stdout.isTTY;
}

function printError(error: unknown, source?: string, filename?: string): void {
  const rendered = renderThrown(error, {
    source,
    filename,
    color: useColor(),
  });
  // Prefix only plain Errors; KinError already has ikosa[Kxxx] header.
  if (isKinError(error)) {
    console.error(rendered);
  } else {
    console.error(`Kin Error: ${rendered}`);
  }
}

program
  .name('kin')
  .description(
    'Kin Programming Language: write computer programs in Kinyarwanda. @cli',
  )
  .usage('command [arguments]')
  .version(
    `\x1b[1mv${pkg.version}\x1b[0m`,
    '-v, --version',
    "Output kin's current version.",
  )
  .helpOption('-h, --help', 'Output usage of Kin.');

program
  .command('repl')
  .description("Enter Kin's Repl")
  .option(
    '--types <mode>',
    'Type safety: on (default), off, or strict. Overrides # kin-types: and KIN_TYPES.',
  )
  .action(async (opts: { types?: string }) => {
    if (opts.types && !normalizeTypeSafetyMode(opts.types)) {
      console.error(
        `Kin Error: Invalid --types mode '${opts.types}'. Use on, off, or strict.`,
      );
      process.exit(1);
    }
    const parser = new Parser();
    if (opts.types) parser.setTypeSafetyOverride(opts.types);
    // Initial mode from CLI / KIN_TYPES (no source yet).
    const initialMode =
      normalizeTypeSafetyMode(opts.types) ??
      normalizeTypeSafetyMode(process.env.KIN_TYPES) ??
      'on';
    const env = createGlobalEnv(process.cwd(), { typeSafety: initialMode });

    console.log(`Repl ${pkg.version} (Kin)`);

    while (true) {
      const input = await rl.question('> ');

      if (!input || input.includes('.exit')) {
        process.exit(1);
      }

      try {
        // Per-line override still wins when set; otherwise re-resolve from
        // this line's `# kin-types:` directive (and env), then apply to env
        // so runtime checks stay aligned with the parser.
        if (!opts.types) {
          parser.setTypeSafetyOverride(undefined);
        }
        const { program: ast, diagnostics, typeSafety } = parser.parse(input);
        applyTypeSafetyToEnv(env, typeSafety);
        if (diagnostics.length > 0) {
          for (const d of diagnostics) {
            printError(d.error, input, 'repl');
          }
          continue;
        }
        Interpreter.evaluate(ast, env);
      } catch (error: unknown) {
        printError(error, input, 'repl');
      }
    }
  });

program
  .command('run <file_location>')
  .description('Runs a given file.')
  .option(
    '--types <mode>',
    'Type safety: on (default), off, or strict. Overrides # kin-types: and KIN_TYPES.',
  )
  .action(async (file_location, opts: { types?: string }) => {
    let source_codes = '';
    try {
      if (opts.types && !normalizeTypeSafetyMode(opts.types)) {
        console.error(
          `Kin Error: Invalid --types mode '${opts.types}'. Use on, off, or strict.`,
        );
        process.exit(1);
      }
      source_codes = await readFile(file_location, 'utf-8');
      const { diagnostics } = runSource(source_codes, {
        filename: file_location,
        typeSafety: opts.types,
        throwOnDiagnostic: false,
      });
      if (diagnostics.length > 0) {
        for (const d of diagnostics) {
          printError(d.error, source_codes, file_location);
        }
        process.exit(1);
      }
      process.exit(0);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        console.error(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        printError(error, source_codes, file_location);
      }
      process.exit(1);
    }
  });

program
  .command('check <file_location>')
  .description('Parse a file and report diagnostics without executing.')
  .option(
    '--types <mode>',
    'Type safety: on (default), off, or strict. Overrides # kin-types: and KIN_TYPES.',
  )
  .action(async (file_location, opts: { types?: string }) => {
    let source_codes = '';
    try {
      if (opts.types && !normalizeTypeSafetyMode(opts.types)) {
        console.error(
          `Kin Error: Invalid --types mode '${opts.types}'. Use on, off, or strict.`,
        );
        process.exit(1);
      }
      source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      parser.setTypeSafetyOverride(opts.types);
      const { diagnostics } = parser.parse(source_codes);
      if (diagnostics.length === 0) {
        console.log(`No issues found in ${file_location}`);
        process.exit(0);
      }
      for (const d of diagnostics) {
        printError(d.error, source_codes, file_location);
      }
      process.exit(1);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        console.error(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        printError(error, source_codes, file_location);
      }
      process.exit(1);
    }
  });

program.parse();
