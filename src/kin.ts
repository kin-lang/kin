/**************************************************************************
 *                      Kin Programming Language                          *
 *                        Apache License 2.0                              *
 *           Copyright (c) MURANGWA Pacifique  and affiliates.            *
 *             Write computer programs in    Kinyarwanda.                 *                                        *
 **************************************************************************/

import Parser from './parser/parser';
import { LogError, LogMessage } from './lib/log';

import * as readline from 'readline/promises';
import { readFileSync } from 'fs';
import { Interpreter } from './runtime/interpreter';
import { createGlobalEnv } from './runtime/globals';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const file = process.argv[2];

if (file) {
  run(file);
} else {
  repl();
}

async function run(filename: string): Promise<void> {
  try {
    const input: string = readFileSync(filename, 'utf-8');
    const parser = new Parser();
    const interpreter = new Interpreter();
    const env = createGlobalEnv(); // global environment
    const program = parser.produceAST(input);
    const results = interpreter.evaluate(program, env);
    console.log(JSON.stringify(results));
  } catch (error) {
    const err = error as Error;
    LogError(err);
    process.exit(1);
  }
}

async function repl() {
  LogMessage('Kin Repl v0.0');

  while (true) {
    const input = await rl.question('> ');

    // check for no user input or exit keyword.
    if (input === '.exit' || input === '.quit' || input === '.q') {
      process.exit(0);
    }

    try {
      const parser = new Parser();
      const interpreter = new Interpreter();
      const env = createGlobalEnv(); // global environment
      const program = parser.produceAST(input);
      const results = interpreter.evaluate(program, env);
      console.log(JSON.stringify(results));
    } catch (error: unknown) {
      const err = error as Error;
      LogError(err);
      process.exit(1);
    }
  }
}
