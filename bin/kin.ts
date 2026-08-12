#!/usr/bin/env node

import { program } from 'commander';
import pkg from '../package.json';
import { readFile } from 'fs/promises';
import {
  Interpreter,
  Parser,
  createGlobalEnv,
  isKinError,
  renderThrown,
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
  .action(async () => {
    const parser = new Parser();
    const env = createGlobalEnv(process.cwd());

    console.log(`Repl ${pkg.version} (Kin)`);

    while (true) {
      const input = await rl.question('> ');

      if (!input || input.includes('.exit')) {
        process.exit(1);
      }

      try {
        const { program: ast, diagnostics } = parser.parse(input);
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
  .action(async (file_location) => {
    let source_codes = '';
    try {
      source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      const { program: ast, diagnostics } = parser.parse(source_codes);
      if (diagnostics.length > 0) {
        for (const d of diagnostics) {
          printError(d.error, source_codes, file_location);
        }
        process.exit(1);
      }
      const env = createGlobalEnv(file_location);
      Interpreter.evaluate(ast, env);
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
  .action(async (file_location) => {
    let source_codes = '';
    try {
      source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
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
