import Parser from './parser/parser';
import Lexer from './lexer/lexer';
import { Interpreter } from './runtime/interpreter';
import { createGlobalEnv } from './runtime/globals';
import Environment from './runtime/environment';
import {
  MK_NUMBER,
  MK_STRING,
  MK_NULL,
  MK_BOOL,
  MK_OBJECT,
  MK_NATIVE_FN,
  RuntimeVal,
  StringVal,
  NumberVal,
  BooleanVal,
  ObjectVal,
  FunctionValue,
  NullVal,
} from './runtime/values';

export {
  Parser,
  Lexer,
  Interpreter,
  createGlobalEnv,
  Environment,
  MK_NUMBER,
  MK_STRING,
  MK_NULL,
  MK_BOOL,
  MK_OBJECT,
  MK_NATIVE_FN,
};

export type {
  RuntimeVal,
  StringVal,
  NumberVal,
  BooleanVal,
  ObjectVal,
  FunctionValue,
  NullVal,
};
