#!/usr/bin/env node

import { program } from 'commander';
import pkg from '../package.json';
import { readFile } from 'fs/promises';
import { Interpreter, Lexer, Parser, createGlobalEnv } from '../src/index';
import * as readline from 'readline/promises';
import { LogError } from '../src/lib/log';

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

      const program = parser.produceAST(input);

      Interpreter.evaluate(program, env);
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
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        LogError(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        error instanceof Error
          ? LogError(`Kin Error: Unhandled : ${(error as Error).message}`)
          : LogError(`Kin Error: Unhandled : ${error as Error}`);
      }
    }
  });

program
  .command('run-lexer <file_location>')
  .description('Runs lexer and log tokens to the console')
  .action(async (file_location) => {
    try {
      const source_codes = await readFile(file_location, 'utf-8');
      const lexer = new Lexer(source_codes);
      const tokens = lexer.tokenize();
      console.dir(tokens, { depth: null });
      process.exit(0);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        LogError(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        error instanceof Error
          ? LogError(`Kin Error: Unhandled : ${(error as Error).message}`)
          : LogError(`Kin Error: Unhandled : ${error as Error}`);
      }
    }
  });

program
  .command('run-parser <file_location>')
  .description('Runs parser and log AST to the console')
  .action(async (file_location) => {
    try {
      const source_codes = await readFile(file_location, 'utf-8');
      const parser = new Parser();
      const ast = parser.produceAST(source_codes);
      console.dir(ast, { depth: null });
      process.exit(0);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        LogError(`Kin Error: Can't resolve file at '${file_location}'`);
      } else {
        error instanceof Error
          ? LogError(`Kin Error: Unhandled : ${(error as Error).message}`)
          : LogError(`Kin Error: Unhandled : ${error as Error}`);
      }
    }
  });

program.parse();
