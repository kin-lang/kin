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
  MK_ARRAY,
  MK_NATIVE_FN,
  RuntimeVal,
  StringVal,
  NumberVal,
  BooleanVal,
  ObjectVal,
  ArrayVal,
  FunctionValue,
  NullVal,
} from './runtime/values';
import {
  KinError,
  KinSyntaxError,
  KinTypeError,
  KinReferenceError,
  KinRuntimeError,
  isKinError,
  isKinSyntaxError,
  isKinTypeError,
  isKinReferenceError,
  isKinRuntimeError,
  createKinError,
  kinError,
  formatKinError,
  categoryForCode,
  CODE_CATEGORY,
} from './lib/errors';
import { renderKinError, renderThrown } from './lib/render-error';
import {
  BUILTIN_TYPE_NAMES,
  assertValueMatchesType,
  annotationTypeName,
  formatTypeAnnotation,
  isBuiltinTypeName,
  normalizeAnnotationName,
  normalizeTypeSafetyMode,
  parseTypeSafetyDirective,
  resolveTypeSafetyMode,
  valueMatchesType,
} from './runtime/types';
import {
  applyTypeSafetyToEnv,
  runSource,
} from './runtime/run';

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
  MK_ARRAY,
  MK_NATIVE_FN,
  KinError,
  KinSyntaxError,
  KinTypeError,
  KinReferenceError,
  KinRuntimeError,
  isKinError,
  isKinSyntaxError,
  isKinTypeError,
  isKinReferenceError,
  isKinRuntimeError,
  createKinError,
  kinError,
  formatKinError,
  categoryForCode,
  CODE_CATEGORY,
  renderKinError,
  renderThrown,
  BUILTIN_TYPE_NAMES,
  assertValueMatchesType,
  annotationTypeName,
  formatTypeAnnotation,
  isBuiltinTypeName,
  normalizeAnnotationName,
  normalizeTypeSafetyMode,
  parseTypeSafetyDirective,
  resolveTypeSafetyMode,
  valueMatchesType,
  runSource,
  applyTypeSafetyToEnv,
};

export type {
  RuntimeVal,
  StringVal,
  NumberVal,
  BooleanVal,
  ObjectVal,
  ArrayVal,
  FunctionValue,
  NullVal,
};

export type {
  KinErrorName,
  KinErrorCategoryCode,
  KinErrorCode,
  KinErrorOptions,
} from './lib/errors';

export type { TypeAnnotation } from './parser/ast';
export type { TypeSafetyMode, BuiltinTypeName } from './runtime/types';
export type { GlobalEnvOptions } from './runtime/globals';
export type { ParseResult, Diagnostic } from './parser/parser';
export type { RunSourceOptions, RunSourceResult } from './runtime/run';
