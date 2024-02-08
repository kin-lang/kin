/**************************************************************************
 *                      Kin Programming Language                          *
 *                        Apache License 2.0                              *
 *           Copyright (c) MURANGWA Pacifique  and affiliates.            *
 *             Write computer programs in    Kinyarwanda.                 *                                        *
 **************************************************************************/

import Parser from './parser/parser';
import { LogError } from './lib/log';

import { readFileSync } from 'fs';
import { Interpreter } from './runtime/interpreter';
import { createGlobalEnv } from './runtime/globals';

const file = process.argv[2];

if (file) {
  run(file);
} else {
  LogError('No file provided');
  process.exit(1);
}

async function run(filename: string): Promise<void> {
  try {
    const input: string = readFileSync(filename, 'utf-8');
    const parser = new Parser();
    const env = createGlobalEnv(); // global environment
    const program = parser.produceAST(input);
    Interpreter.evaluate(program, env);
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    LogError(err);
    process.exit(1);
  }
}
