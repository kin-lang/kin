#!/usr/bin/env node

import { program } from 'commander';
import pkg from '../package.json';
import { readFile } from 'fs/promises';
import {
  Interpreter,
  Parser,
  createGlobalEnv,
  formatKinError,
} from '../src/index';
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

      // check for no user input or exit keyword.
      if (!input || input.includes('.exit')) {
        process.exit(1);
      }

      try {
        const program = parser.produceAST(input);
        Interpreter.evaluate(program, env);
      } catch (error: unknown) {
        console.error(formatKinError(error));
      }
    }
  });

program
  .command('run <file_location>')
  .description('Runs a given file.')
  .action(async (file_location) => {
    try {
      const source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      const ast = parser.produceAST(source_codes); // Produce AST for Kin
      const env = createGlobalEnv(file_location); // create global environment for Kin
      Interpreter.evaluate(ast, env); // Evaluate the program
      process.exit(0);
    } catch (error: unknown) {
      if (isNodeErrno(error) && error.code === 'ENOENT') {
        console.error(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        console.error(`Kin Error: ${formatKinError(error)}`);
      }
      process.exit(1);
    }
  });

program.parse();

function isNodeErrno(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  );
}
