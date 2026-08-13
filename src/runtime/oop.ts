/***********************************************************************
 *                         OOP evaluation helpers                      *
 *   imiterere / tegura / rema / methods / field init / visibility     *
 ***********************************************************************/

import {
  ClassDeclaration,
  FieldInitStatement,
  RemaExpr,
} from '../parser/ast';
import { createKinError } from '../lib/errors';
import Environment, { findConstructor } from './environment';
import { Interpreter } from './interpreter';
import { assertValueMatchesType, resolveAnnotation } from './types';
import {
  BoundMethodVal,
  ClassMethodDef,
  ClassVal,
  InstanceVal,
  MK_NULL,
  RuntimeVal,
} from './values';
import { BreakSignal, ContinueSignal, ReturnSignal } from './signals';

export function eval_class_declaration(
  decl: ClassDeclaration,
  env: Environment,
): RuntimeVal {
  let parent: ClassVal | undefined;
  if (decl.parentName) {
    const p = env.lookupVar(decl.parentName);
    if (p.type !== 'class') {
      throw createKinError('K042', {
        span: decl.span,
        params: { name: decl.parentName },
        message: `'${decl.parentName}' is not a class (imiterere)`,
      });
    }
    parent = p as ClassVal;
  }

  const klass: ClassVal = {
    type: 'class',
    name: decl.name,
    parent,
    hasConstructor: !!decl.constructor,
    constructorParams: [],
    constructorBody: [],
    methods: new Map(),
    declarationEnv: env,
  };

  if (decl.constructor) {
    klass.constructorParams = decl.constructor.parameters.map((p) => p.name);
    klass.constructorParamTypes = decl.constructor.parameters.map((p) =>
      p.typeAnnotation ? resolveAnnotation(p.typeAnnotation, env) : undefined,
    );
    klass.constructorBody = decl.constructor.body;
  }

  for (const m of decl.methods) {
    if (klass.methods.has(m.name)) {
      throw createKinError('K043', {
        span: m.span,
        params: { name: m.name },
        message: `Method '${m.name}' is already defined on ${decl.name}`,
      });
    }
    const def: ClassMethodDef = {
      visibility: m.visibility,
      name: m.name,
      parameters: m.parameters.map((p) => p.name),
      parameterTypes: m.parameters.map((p) =>
        p.typeAnnotation ? resolveAnnotation(p.typeAnnotation, env) : undefined,
      ),
      returnType: m.returnType
        ? resolveAnnotation(m.returnType, env)
        : undefined,
      body: m.body,
      ownerClass: klass,
    };
    klass.methods.set(m.name, def);
  }

  env.declareVar(decl.name, klass, true);
  env.declareType(decl.name, {
    kind: 'class',
    className: decl.name,
    classRef: klass,
  });

  return klass;
}

export function eval_rema(expr: RemaExpr, env: Environment): RuntimeVal {
  const classVal = Interpreter.evaluate(expr.classExpr, env);
  if (classVal.type !== 'class') {
    throw createKinError('K042', {
      span: expr.span,
      params: { name: 'rema' },
      message: `rema expects a class (imiterere), got ${classVal.type}`,
    });
  }
  const klass = classVal as ClassVal;
  const args = expr.args.map((a) => Interpreter.evaluate(a, env));
  const ctor = findConstructor(klass);

  if (args.length !== ctor.params.length) {
    throw createKinError('K011', {
      span: expr.span,
      params: { expected: ctor.params.length, got: args.length },
      message: `Wrong number of arguments for rema ${klass.name}: expected ${ctor.params.length}, got ${args.length}`,
    });
  }

  const instance: InstanceVal = {
    type: 'instance',
    klass,
    fields: new Map(),
    fieldVisibility: new Map(),
    fieldOwner: new Map(),
  };

  const scope = new Environment(ctor.owner.declarationEnv);
  scope.declareVar('_', instance, true);

  for (let i = 0; i < ctor.params.length; i++) {
    const pt = ctor.paramTypes?.[i];
    scope.declareVar(ctor.params[i], args[i], false, pt, expr.span);
  }

  Interpreter.pushMethodContext({
    declaringClass: ctor.owner,
    instance,
    isConstructor: true,
  });
  try {
    try {
      for (const stmt of ctor.body) {
        Interpreter.evaluate(stmt, scope);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        return instance;
      }
      if (e instanceof BreakSignal) {
        throw createKinError('K019', {
          span: expr.span,
          params: { name: 'hagarara' },
          message: 'hagarara cannot be used across a function boundary',
        });
      }
      if (e instanceof ContinueSignal) {
        throw createKinError('K019', {
          span: expr.span,
          params: { name: 'komeza' },
          message: 'komeza cannot be used across a function boundary',
        });
      }
      throw e;
    }
  } finally {
    Interpreter.popMethodContext();
  }

  return instance;
}

export function eval_field_init(
  stmt: FieldInitStatement,
  env: Environment,
): RuntimeVal {
  const ctx = Interpreter.getMethodContext();
  if (!ctx || !ctx.isConstructor) {
    throw createKinError('K038', {
      span: stmt.span,
      message: 'Field initialization is only allowed inside tegura',
    });
  }

  const { instance, declaringClass: owner } = ctx;

  if (instance.fields.has(stmt.name)) {
    throw createKinError('K043', {
      span: stmt.span,
      params: { name: stmt.name },
      message: `Field '${stmt.name}' is already defined`,
    });
  }

  const value = Interpreter.evaluate(stmt.value, env);
  instance.fields.set(stmt.name, value);
  instance.fieldVisibility.set(stmt.name, stmt.visibility);
  instance.fieldOwner.set(stmt.name, owner);
  return value;
}

export function call_bound_method(
  bound: BoundMethodVal,
  args: RuntimeVal[],
  span?: import('../lib/span').Span,
): RuntimeVal {
  const { receiver, method } = bound;

  // Re-check private so a leaked bound method cannot be invoked outside.
  if (method.visibility === 'bwite') {
    const ctx = Interpreter.getMethodContext();
    if (!ctx || ctx.declaringClass !== method.ownerClass) {
      throw createKinError('K041', {
        span,
        params: { name: method.name },
        message: `Cannot access private method '${method.name}'`,
      });
    }
  }

  if (args.length !== method.parameters.length) {
    throw createKinError('K011', {
      span,
      params: {
        expected: method.parameters.length,
        got: args.length,
      },
      message: `Wrong number of arguments: expected ${method.parameters.length}, got ${args.length}`,
    });
  }

  const scope = new Environment(method.ownerClass.declarationEnv);
  scope.declareVar('_', receiver, true);

  for (let i = 0; i < method.parameters.length; i++) {
    const pt = method.parameterTypes?.[i];
    scope.declareVar(method.parameters[i], args[i], false, pt, span);
  }

  Interpreter.pushMethodContext({
    declaringClass: method.ownerClass,
    instance: receiver,
    isConstructor: false,
  });
  try {
    try {
      for (const stmt of method.body) {
        Interpreter.evaluate(stmt, scope);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        if (method.returnType) {
          assertValueMatchesType(e.value, method.returnType, span);
        }
        return e.value;
      }
      if (e instanceof BreakSignal) {
        throw createKinError('K019', {
          span,
          params: { name: 'hagarara' },
          message: 'hagarara cannot be used across a function boundary',
        });
      }
      if (e instanceof ContinueSignal) {
        throw createKinError('K019', {
          span,
          params: { name: 'komeza' },
          message: 'komeza cannot be used across a function boundary',
        });
      }
      throw e;
    }
  } finally {
    Interpreter.popMethodContext();
  }

  if (method.returnType) {
    assertValueMatchesType(MK_NULL(), method.returnType, span);
  }
  return MK_NULL();
}
