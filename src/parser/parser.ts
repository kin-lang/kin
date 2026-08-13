/****************************************
 *              Parser                  *
 *       Produces Kin's AST             *
 ****************************************/

import Lexer, { Token, tokenSpan } from '../lexer/lexer';
import TokenType from '../lexer/tokens';
import { KinError, createKinError } from '../lib/errors';
import { Span, emptySpan, mergeSpans } from '../lib/span';
import {
  Expr,
  FunctionParameter,
  Program,
  Stmt,
  TypeAnnotation,
  TypeNode,
  mkArray,
  mkAssign,
  mkBinary,
  mkBreak,
  mkCall,
  mkConditional,
  mkContinue,
  mkFunction,
  mkFunctionParam,
  mkIdent,
  mkLoop,
  mkMember,
  mkNamedType,
  mkNumber,
  mkObject,
  mkObjectType,
  mkPickType,
  mkProgram,
  mkProperty,
  mkReturn,
  mkString,
  mkTypeAlias,
  mkTypeAnnotation,
  mkUnary,
  mkUnionType,
  mkVarDecl,
  ObjectTypeProperty,
} from './ast';

export interface Diagnostic {
  severity: 'error' | 'warning';
  error: KinError;
}

export interface ParseResult {
  program: Program;
  diagnostics: Diagnostic[];
}

/**
 * Recursive-descent parser.
 *
 * Token stream is an array plus a cursor (`pos`). eat() advances the cursor
 * in O(1); it never advances past the EOF token.
 */
export default class Parser {
  private tokens: Token[] = [];
  private pos = 0;
  private loopDepth = 0;
  private diagnostics: Diagnostic[] = [];
  /** When true, the first error is thrown (produceAST). When false, recover. */
  private throwOnError = true;
  private source = '';

  private not_eof(): boolean {
    return this.at().type != TokenType.EOF;
  }

  private at(): Token {
    return this.tokens[this.pos];
  }

  /** Look ahead `offset` tokens without consuming. offset=0 is at(). */
  private peek(offset = 1): Token {
    const i = this.pos + offset;
    if (i >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[i];
  }

  /**
   * Consume the current token and return it.
   * Does not advance past EOF so repeated eat() at end is safe.
   */
  private eat(): Token {
    const prev = this.at();
    if (prev.type !== TokenType.EOF) {
      this.pos++;
    }
    return prev;
  }

  private expect(type: TokenType, expected: string): Token {
    const prev = this.eat();
    if (!prev || prev.type != type) {
      this.fail(
        'K002',
        tokenSpan(prev),
        {
          expected,
          lexeme: prev.lexeme,
        },
        `Expected ${expected}, found ${prev.lexeme}`,
      );
    }
    return prev;
  }

  private fail(
    code: string,
    span: Span,
    params: Record<string, string | number> = {},
    message?: string,
  ): never {
    const error = createKinError(code, { span, params, message });
    if (this.throwOnError) {
      throw error;
    }
    this.diagnostics.push({ severity: 'error', error });
    // Throw a special recovery signal so the caller can synchronize.
    throw new ParseRecovery(error);
  }

  /**
   * Backwards-compatible entry: throws on the first error.
   * Existing callers and tests keep this behaviour.
   */
  public produceAST(sourceCodes: string): Program {
    const result = this.parseInternal(sourceCodes, true);
    if (result.diagnostics.length > 0) {
      throw result.diagnostics[0].error;
    }
    return result.program;
  }

  /**
   * Parse with error recovery. Returns the (possibly partial) AST plus
   * every diagnostic collected. The CLI refuses to evaluate when any
   * error diagnostic is present.
   */
  public parse(sourceCodes: string): ParseResult {
    return this.parseInternal(sourceCodes, false);
  }

  private parseInternal(
    sourceCodes: string,
    throwOnError: boolean,
  ): ParseResult {
    this.source = sourceCodes;
    this.throwOnError = throwOnError;
    this.diagnostics = [];
    this.pos = 0;
    this.loopDepth = 0;

    const lexer = new Lexer(sourceCodes);
    this.tokens = lexer.tokenize();

    const body: Stmt[] = [];
    while (this.not_eof()) {
      try {
        body.push(this.parse_stmt());
      } catch (e) {
        if (e instanceof ParseRecovery) {
          this.synchronize();
          continue;
        }
        throw e;
      }
    }

    const span =
      body.length > 0
        ? mergeSpans(body[0].span, body[body.length - 1].span)
        : emptySpan();

    return {
      program: mkProgram(body, span),
      diagnostics: this.diagnostics,
    };
  }

  /**
   * Skip tokens until a plausible statement boundary so the parser can
   * report more than one error per run.
   */
  private synchronize(): void {
    // Always advance at least one token to avoid infinite loops.
    if (this.not_eof()) this.eat();
    while (this.not_eof()) {
      const t = this.at().type;
      if (
        t === TokenType.REKA ||
        t === TokenType.NTAHINDUKA ||
        t === TokenType.NIBA ||
        t === TokenType.SUBIRAMO_NIBA ||
        t === TokenType.POROGARAMU_NTOYA ||
        t === TokenType.GERERANYA ||
        t === TokenType.TANGA ||
        t === TokenType.UBWOKO ||
        t === TokenType.CLOSE_CURLY_BRACES ||
        t === TokenType.HAGARARA ||
        t === TokenType.KOMEZA
      ) {
        return;
      }
      this.eat();
    }
  }

  private parse_stmt(): Stmt {
    switch (this.at().type) {
      case TokenType.REKA:
      case TokenType.NTAHINDUKA:
        return this.parse_var_declaration();
      case TokenType.UBWOKO:
        // `ubwoko Name = Type` is a type alias. `ubwoko(x)` / bare use is an expression.
        if (
          this.peek(1).type === TokenType.IDENTIFIER &&
          this.peek(2).type === TokenType.EQUAL
        ) {
          return this.parse_type_alias_declaration();
        }
        return this.parse_expr();
      case TokenType.NIBA:
        return this.parse_if_statement();
      case TokenType.GERERANYA:
        return this.parse_switch_statement();
      case TokenType.SUBIRAMO_NIBA:
        return this.parse_loop_statement();
      case TokenType.HAGARARA:
        return this.parse_break_statement();
      case TokenType.KOMEZA:
        return this.parse_continue_statement();
      case TokenType.POROGARAMU_NTOYA:
        return this.parse_function_declaration();
      case TokenType.TANGA:
        return this.parse_return_expr();
      default:
        return this.parse_expr();
    }
  }

  private parse_switch_statement(): Stmt {
    const startTok = this.eat(); // gereranya
    this.expect(TokenType.OPEN_PARANTHESES, '(');
    const determinant = this.parse_primary_expr();
    this.expect(TokenType.CLOSE_PARANTHESES, ')');
    this.expect(TokenType.OPEN_CURLY_BRACES, '{');
    return this.parse_case_statement(determinant, tokenSpan(startTok));
  }

  /**
   * Desugar gereranya into nested conditionals.
   * A switch with only ibindi runs the default body unconditionally
   * (condition is always true).
   */
  private parse_case_statement(determinant: Expr, startSpan: Span): Stmt {
    let root: ReturnType<typeof mkConditional> | undefined;
    let cur: ReturnType<typeof mkConditional> | undefined;
    let onlyDefault: Stmt[] | undefined;

    while (this.not_eof() && this.at().type !== TokenType.CLOSE_CURLY_BRACES) {
      if (this.at().type === TokenType.USANZE) {
        this.eat(); // usanze
        const label = this.parse_primary_expr();
        const body = this.parse_case_block();
        const condition = mkBinary(determinant, '==', label);
        const node = mkConditional(
          condition,
          body,
          [],
          mergeSpans(
            condition.span,
            body.length ? body[body.length - 1].span : condition.span,
          ),
        );
        if (!root) root = node;
        else (cur!.alternate as Stmt[]).push(node);
        cur = node;
      } else if (this.at().type === TokenType.IBINDI) {
        this.eat();
        const defBody = this.parse_case_block();
        if (cur) {
          (cur.alternate as Stmt[]).push(...defBody);
        } else {
          // Default-only switch: run the body unconditionally.
          onlyDefault = defBody;
        }
        break;
      } else {
        break;
      }
    }

    const endTok = this.expect(TokenType.CLOSE_CURLY_BRACES, '}');
    const span = mergeSpans(startSpan, tokenSpan(endTok));

    if (onlyDefault) {
      // niba (nibyo) { default body }
      return mkConditional(mkIdent('nibyo', startSpan), onlyDefault, [], span);
    }

    if (!root) {
      return mkConditional(
        mkBinary(determinant, '==', mkString('', startSpan)),
        [],
        [],
        span,
      );
    }
    root.span = span;
    return root;
  }

  private parse_case_block(): Stmt[] {
    this.expect(TokenType.COLON, ':');
    const body: Stmt[] = [];
    while (
      this.not_eof() &&
      this.at().type != TokenType.USANZE &&
      this.at().type != TokenType.IBINDI &&
      this.at().type != TokenType.CLOSE_CURLY_BRACES
    ) {
      body.push(this.parse_stmt());
    }
    return body;
  }

  private parse_return_expr(): Expr {
    const startTok = this.eat(); // tanga

    if (this.at().type == TokenType.SEMI_COLON) {
      const semi = this.eat();
      return mkReturn(
        undefined,
        mergeSpans(tokenSpan(startTok), tokenSpan(semi)),
      );
    }

    const value = this.parse_expr();
    return mkReturn(value, mergeSpans(tokenSpan(startTok), value.span));
  }

  private parse_break_statement(): Stmt {
    const tok = this.eat(); // hagarara
    let span = tokenSpan(tok);
    if (this.at().type == TokenType.SEMI_COLON) {
      span = mergeSpans(span, tokenSpan(this.eat()));
    }
    return mkBreak(span);
  }

  private parse_continue_statement(): Stmt {
    if (this.loopDepth === 0) {
      this.fail(
        'K013',
        tokenSpan(this.at()),
        {},
        'komeza can only be used inside a loop',
      );
    }
    const tok = this.eat(); // komeza
    let span = tokenSpan(tok);
    if (this.at().type == TokenType.SEMI_COLON) {
      span = mergeSpans(span, tokenSpan(this.eat()));
    }
    return mkContinue(span);
  }

  private parse_block_statement(): Stmt[] {
    this.expect(TokenType.OPEN_CURLY_BRACES, '{');
    const body: Stmt[] = [];
    while (this.not_eof() && this.at().type != TokenType.CLOSE_CURLY_BRACES) {
      try {
        body.push(this.parse_stmt());
      } catch (e) {
        if (e instanceof ParseRecovery) {
          this.synchronize();
          continue;
        }
        throw e;
      }
    }
    this.expect(TokenType.CLOSE_CURLY_BRACES, '}');
    return body;
  }

  private parse_var_declaration(): Stmt {
    const startTok = this.at();
    const isConstant = this.eat().type == TokenType.NTAHINDUKA;
    const nameTok = this.expect(TokenType.IDENTIFIER, 'variable name');
    const identifier = nameTok.lexeme;

    const typeAnnotation =
      this.at().type == TokenType.COLON
        ? this.parse_type_annotation()
        : undefined;

    if (this.at().type == TokenType.SEMI_COLON) {
      const semi = this.eat();
      if (isConstant) {
        this.fail(
          'K020',
          mergeSpans(tokenSpan(startTok), tokenSpan(semi)),
          {},
          'Constant variables must be assigned a value',
        );
      }
      return mkVarDecl(
        identifier,
        false,
        undefined,
        mergeSpans(tokenSpan(startTok), tokenSpan(semi)),
        typeAnnotation,
      );
    }

    this.expect(TokenType.EQUAL, '=');
    const value = this.parse_expr();
    return mkVarDecl(
      identifier,
      isConstant,
      value,
      mergeSpans(tokenSpan(startTok), value.span),
      typeAnnotation,
    );
  }

  /**
   * `ubwoko Name = TypeExpr`
   * Type aliases are statements; the type expression is kept on the AST
   * and resolved / registered at runtime (not erased).
   */
  private parse_type_alias_declaration(): Stmt {
    const startTok = this.eat(); // ubwoko
    const nameTok = this.expect(TokenType.IDENTIFIER, 'type name');
    this.expect(TokenType.EQUAL, '=');
    const type = this.parse_type_expr();
    return mkTypeAlias(
      nameTok.lexeme,
      type,
      mergeSpans(tokenSpan(startTok), type.span),
    );
  }

  /** `: TypeExpr` optionally followed by `?` for optional types. */
  private parse_type_annotation(): TypeAnnotation {
    const colon = this.expect(TokenType.COLON, ':');
    const type = this.parse_type_expr();
    let optional = false;
    let endSpan = type.span;
    if (this.at().type == TokenType.QUESTION) {
      const q = this.eat();
      optional = true;
      endSpan = tokenSpan(q);
    }
    return mkTypeAnnotation(
      type,
      optional,
      mergeSpans(tokenSpan(colon), endSpan),
    );
  }

  /**
   * Type expression grammar (low → high):
   *   unionType  ::= primaryType ("|" primaryType)*
   *   primaryType ::= named | object | Fata<…> | "(" type ")"
   */
  private parse_type_expr(): TypeNode {
    let left = this.parse_type_primary();
    if (this.at().type != TokenType.PIPE) return left;

    const members: TypeNode[] = [left];
    while (this.at().type == TokenType.PIPE) {
      this.eat(); // |
      members.push(this.parse_type_primary());
    }
    return mkUnionType(
      members,
      mergeSpans(members[0].span, members[members.length - 1].span),
    );
  }

  private parse_type_primary(): TypeNode {
    // Parenthesized type: (ijambo | umubare)
    if (this.at().type == TokenType.OPEN_PARANTHESES) {
      const open = this.eat();
      const inner = this.parse_type_expr();
      const close = this.expect(TokenType.CLOSE_PARANTHESES, ')');
      inner.span = mergeSpans(tokenSpan(open), tokenSpan(close));
      return inner;
    }

    // Object type: { key: Type, ... }
    if (this.at().type == TokenType.OPEN_CURLY_BRACES) {
      return this.parse_object_type();
    }

    // `porogaramu_ntoya` is a keyword token but also a type name (functions).
    if (this.at().type == TokenType.POROGARAMU_NTOYA) {
      const tok = this.eat();
      return mkNamedType('porogaramu_ntoya', tokenSpan(tok));
    }

    // Named type or Fata<T, keys>
    if (this.at().type == TokenType.IDENTIFIER) {
      const nameTok = this.eat();
      if (
        nameTok.lexeme === 'Fata' &&
        this.at().type == TokenType.LESS_THAN
      ) {
        return this.parse_fata_type(nameTok);
      }
      return mkNamedType(nameTok.lexeme, tokenSpan(nameTok));
    }

    return this.fail(
      'K032',
      tokenSpan(this.at()),
      { lexeme: this.at().lexeme },
      `Expected a type, found ${this.at().lexeme}`,
    );
  }

  /** `Fata < TargetType , "key" | "key2" >` (Pick) */
  private parse_fata_type(fataTok: Token): TypeNode {
    this.expect(TokenType.LESS_THAN, '<');
    const target = this.parse_type_expr();
    this.expect(TokenType.COMMA, ',');

    const keys: string[] = [];
    const firstKey = this.expect(TokenType.STRING, 'property name string');
    keys.push(firstKey.lexeme);
    while (this.at().type == TokenType.PIPE) {
      this.eat();
      const keyTok = this.expect(TokenType.STRING, 'property name string');
      keys.push(keyTok.lexeme);
    }

    const close = this.expect(TokenType.GREATER_THAN, '>');
    return mkPickType(
      target,
      keys,
      mergeSpans(tokenSpan(fataTok), tokenSpan(close)),
    );
  }

  /** `{ key: Type, key2: Type }` */
  private parse_object_type(): TypeNode {
    const startTok = this.eat(); // {
    const properties: ObjectTypeProperty[] = [];

    while (this.not_eof() && this.at().type != TokenType.CLOSE_CURLY_BRACES) {
      const keyTok = this.expect(TokenType.IDENTIFIER, 'type property name');
      this.expect(TokenType.COLON, ':');
      const propType = this.parse_type_expr();
      properties.push({
        key: keyTok.lexeme,
        type: propType,
        span: mergeSpans(tokenSpan(keyTok), propType.span),
      });
      if (this.at().type != TokenType.CLOSE_CURLY_BRACES) {
        this.expect(TokenType.COMMA, ',');
      }
    }

    const endTok = this.expect(TokenType.CLOSE_CURLY_BRACES, '}');
    return mkObjectType(
      properties,
      mergeSpans(tokenSpan(startTok), tokenSpan(endTok)),
    );
  }

  private parse_expr(): Expr {
    return this.parse_assignment_expr();
  }

  /**
   * Primary atoms: identifiers, literals, grouping, unary ! / -.
   * Array and object literals also live here so they can take postfix
   * member / call chains: [1,2,3][0], {a:1}.a
   */
  private parse_primary_expr(): Expr {
    const tk = this.at().type;
    switch (tk) {
      case TokenType.IDENTIFIER: {
        const tok = this.eat();
        return mkIdent(tok.lexeme, tokenSpan(tok));
      }
      // `ubwoko` is a keyword for type aliases, but remains a call-able name
      // in expressions: ubwoko(x) / ubwoko x (if used as bare identifier).
      case TokenType.UBWOKO: {
        const tok = this.eat();
        return mkIdent('ubwoko', tokenSpan(tok));
      }
      case TokenType.INTEGER:
      case TokenType.FLOAT: {
        const tok = this.eat();
        return mkNumber(parseFloat(tok.lexeme), tokenSpan(tok));
      }
      case TokenType.STRING: {
        const tok = this.eat();
        return mkString(tok.lexeme, tokenSpan(tok));
      }
      case TokenType.OPEN_PARANTHESES: {
        this.eat();
        const value = this.parse_expr();
        this.expect(TokenType.CLOSE_PARANTHESES, ')');
        return value;
      }
      case TokenType.OPEN_BRACKET:
        return this.parse_array_literal();
      case TokenType.OPEN_CURLY_BRACES:
        return this.parse_object_literal();
      case TokenType.NEGATION:
        return this.parse_unary_expr();
      case TokenType.MINUS:
        return this.parse_unary_expr();
      default:
        return this.fail(
          'K001',
          tokenSpan(this.at()),
          { lexeme: this.at().lexeme },
          `Unexpected token ${this.at().lexeme}`,
        );
    }
  }

  private parse_unary_expr(): Expr {
    const opTok = this.eat(); // ! or -
    const operand = this.parse_primary_expr();
    return mkUnary(
      opTok.lexeme,
      operand,
      mergeSpans(tokenSpan(opTok), operand.span),
    );
  }

  private parse_logical_expr(): Expr {
    let left = this.parse_relational_expr();

    while (['&&', '||'].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_relational_expr();
      left = mkBinary(left, operator, right);
    }

    return left;
  }

  private parse_relational_expr(): Expr {
    let left = this.parse_additive_expr();

    if (['<', '>', '==', '!=', '<=', '>='].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_additive_expr();
      left = mkBinary(left, operator, right);
    }

    return left;
  }

  private parse_additive_expr(): Expr {
    let left = this.parse_multiplicative_expr();

    while (['+', '-'].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_multiplicative_expr();
      left = mkBinary(left, operator, right);
    }

    return left;
  }

  private parse_multiplicative_expr(): Expr {
    let left = this.parse_exponent_expr();

    while (['/', '*', '%'].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_exponent_expr();
      left = mkBinary(left, operator, right);
    }

    return left;
  }

  /**
   * Exponentiation: right-associative, higher precedence than * / %.
   * 2 ^ 3 ^ 2  =>  2 ^ (3 ^ 2)  = 512
   */
  private parse_exponent_expr(): Expr {
    const left = this.parse_call_member_expr();

    if (this.at().lexeme === '^') {
      const operator = this.eat().lexeme;
      const right = this.parse_exponent_expr(); // right-assoc
      return mkBinary(left, operator, right);
    }

    return left;
  }

  private parse_call_member_expr(): Expr {
    const member = this.parse_member_expr();

    if (this.at().type == TokenType.OPEN_PARANTHESES) {
      return this.parse_call_expr(member);
    }

    return member;
  }

  private parse_call_expr(caller: Expr): Expr {
    const args = this.parse_args();
    // Span ends at the ')' we just consumed (pos-1).
    const endTok = this.tokens[this.pos - 1];
    let call_expr: Expr = mkCall(
      caller,
      args,
      mergeSpans(caller.span, tokenSpan(endTok)),
    );

    if (this.at().type == TokenType.OPEN_PARANTHESES) {
      call_expr = this.parse_call_expr(call_expr);
    }

    return call_expr;
  }

  private parse_member_expr(): Expr {
    let object = this.parse_primary_expr();

    while (
      this.at().type == TokenType.DOT ||
      this.at().type == TokenType.OPEN_BRACKET
    ) {
      const operator = this.eat();
      let property: Expr;
      let computed: boolean;
      let endSpan: Span;

      if (operator.type == TokenType.DOT) {
        computed = false;
        property = this.parse_primary_expr();
        if (property.kind !== 'Identifier') {
          this.fail(
            'K021',
            property.span,
            {},
            'Dot operator requires an identifier on the right-hand side',
          );
        }
        endSpan = property.span;
      } else {
        computed = true;
        property = this.parse_expr();
        const close = this.expect(TokenType.CLOSE_BRACKET, ']');
        endSpan = tokenSpan(close);
      }

      object = mkMember(
        object,
        property,
        computed,
        mergeSpans(object.span, endSpan),
      );
    }

    return object;
  }

  private parse_array_literal(): Expr {
    const startTok = this.eat(); // [
    const elements: Expr[] = [];

    while (this.not_eof() && this.at().type != TokenType.CLOSE_BRACKET) {
      elements.push(this.parse_expr());
      if (this.at().type != TokenType.CLOSE_BRACKET) {
        this.expect(TokenType.COMMA, ',');
      }
    }

    const endTok = this.expect(TokenType.CLOSE_BRACKET, ']');
    return mkArray(
      elements,
      mergeSpans(tokenSpan(startTok), tokenSpan(endTok)),
    );
  }

  private parse_object_literal(): Expr {
    const startTok = this.eat(); // {
    const properties = [];

    while (this.not_eof() && this.at().type != TokenType.CLOSE_CURLY_BRACES) {
      const keyTok = this.expect(TokenType.IDENTIFIER, 'object key');
      const key = keyTok.lexeme;

      if (this.at().type == TokenType.COMMA) {
        this.eat();
        properties.push(mkProperty(key, undefined, tokenSpan(keyTok)));
        continue;
      } else if (this.at().type == TokenType.CLOSE_CURLY_BRACES) {
        properties.push(mkProperty(key, undefined, tokenSpan(keyTok)));
        continue;
      }

      this.expect(TokenType.COLON, ':');
      const value = this.parse_expr();
      properties.push(
        mkProperty(key, value, mergeSpans(tokenSpan(keyTok), value.span)),
      );

      if (this.at().type != TokenType.CLOSE_CURLY_BRACES) {
        this.expect(TokenType.COMMA, ',');
      }
    }

    const endTok = this.expect(TokenType.CLOSE_CURLY_BRACES, '}');
    return mkObject(
      properties,
      mergeSpans(tokenSpan(startTok), tokenSpan(endTok)),
    );
  }

  private parse_if_statement(): Stmt {
    const startTok = this.eat(); // niba or nanone_niba
    this.expect(TokenType.OPEN_PARANTHESES, '(');
    const condition = this.parse_expr();
    this.expect(TokenType.CLOSE_PARANTHESES, ')');
    const body = this.parse_block_statement();
    let alternate: Stmt[] = [];

    if (this.at().type == TokenType.NANONE_NIBA) {
      alternate = [this.parse_if_statement()];
    } else if (this.at().type == TokenType.NIBA_BYANZE) {
      this.eat();
      alternate = this.parse_block_statement();
    }

    const endSpan =
      alternate.length > 0
        ? alternate[alternate.length - 1].span
        : body.length > 0
          ? body[body.length - 1].span
          : condition.span;

    return mkConditional(
      condition,
      body,
      alternate,
      mergeSpans(tokenSpan(startTok), endSpan),
    );
  }

  private parse_loop_statement(): Stmt {
    const startTok = this.eat(); // subiramo_niba
    this.expect(TokenType.OPEN_PARANTHESES, '(');
    const condition = this.parse_expr();
    this.expect(TokenType.CLOSE_PARANTHESES, ')');
    this.loopDepth++;
    try {
      const body = this.parse_block_statement();
      const endSpan =
        body.length > 0 ? body[body.length - 1].span : condition.span;
      return mkLoop(condition, body, mergeSpans(tokenSpan(startTok), endSpan));
    } finally {
      this.loopDepth--;
    }
  }

  private parse_function_declaration(): Stmt {
    const startTok = this.eat(); // porogaramu_ntoya
    const nameTok = this.expect(TokenType.IDENTIFIER, 'function name');
    const name = nameTok.lexeme;

    const params = this.parse_function_params();

    // Optional return type: ): number {
    let returnType: TypeAnnotation | undefined;
    if (this.at().type == TokenType.COLON) {
      returnType = this.parse_type_annotation();
    }

    // continue/break inside a function are not tied to an enclosing loop
    const savedLoopDepth = this.loopDepth;
    this.loopDepth = 0;
    let body: Stmt[];
    try {
      body = this.parse_block_statement();
    } finally {
      this.loopDepth = savedLoopDepth;
    }

    const endSpan =
      body.length > 0 ? body[body.length - 1].span : tokenSpan(nameTok);
    return mkFunction(
      name,
      params,
      body,
      mergeSpans(tokenSpan(startTok), endSpan),
      returnType,
    );
  }

  /**
   * Parameter list for function declarations: `(a: number, b: string?)`.
   * Call-site argument lists still use parse_args().
   */
  private parse_function_params(): FunctionParameter[] {
    this.expect(TokenType.OPEN_PARANTHESES, '(');
    const params: FunctionParameter[] = [];

    if (this.at().type != TokenType.CLOSE_PARANTHESES) {
      params.push(this.parse_function_param());
      while (this.at().type == TokenType.COMMA) {
        this.eat();
        params.push(this.parse_function_param());
      }
    }

    this.expect(TokenType.CLOSE_PARANTHESES, ')');
    return params;
  }

  private parse_function_param(): FunctionParameter {
    if (this.at().type != TokenType.IDENTIFIER) {
      this.fail(
        'K022',
        tokenSpan(this.at()),
        {},
        'Expected identifier for function parameter',
      );
    }
    const nameTok = this.eat();
    const typeAnnotation =
      this.at().type == TokenType.COLON
        ? this.parse_type_annotation()
        : undefined;
    const span = typeAnnotation
      ? mergeSpans(tokenSpan(nameTok), typeAnnotation.span)
      : tokenSpan(nameTok);
    return mkFunctionParam(nameTok.lexeme, span, typeAnnotation);
  }

  private parse_args(): Expr[] {
    this.expect(TokenType.OPEN_PARANTHESES, '(');
    const args =
      this.at().type == TokenType.CLOSE_PARANTHESES
        ? []
        : this.parse_args_list();
    this.expect(TokenType.CLOSE_PARANTHESES, ')');
    return args;
  }

  private parse_args_list(): Expr[] {
    const args: Expr[] = [this.parse_assignment_expr()];
    while (this.at().type == TokenType.COMMA && this.eat()) {
      args.push(this.parse_assignment_expr());
    }
    return args;
  }

  private parse_assignment_expr(): Expr {
    // Assignment binds less tightly than everything else.
    // Left side starts at call/member (which includes literals with postfix).
    const left = this.parse_logical_expr();
    if (this.at().type == TokenType.EQUAL) {
      this.eat();
      const value = this.parse_assignment_expr();
      return mkAssign(left, value);
    }
    return left;
  }
}

/** Internal signal used only for error recovery inside parse(). */
class ParseRecovery {
  readonly error: KinError;
  constructor(error: KinError) {
    this.error = error;
  }
}
