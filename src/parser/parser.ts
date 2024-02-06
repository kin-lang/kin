/****************************************
 *              Parser                  *
 *       Produces Kin's AST             *
 ****************************************/

import Lexer, { Token } from '../lexer/lexer';
import TokenType from '../lexer/tokens';
import { LogError } from '../lib/log';
import {
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  ConditionalStmt,
  Expr,
  FunctionDeclaration,
  Identifier,
  LoopStatement,
  MemberExpr,
  NumericLiteral,
  ObjectLiteral,
  Program,
  Property,
  ReturnExpr,
  Stmt,
  StringLiteral,
  VariableDeclaration,
} from './ast';

export default class Parser {
  private tokens: Token[] = [];

  private not_eof(): boolean {
    return this.tokens[0].type != TokenType.EOF;
  }

  private at() {
    return this.tokens[0] as Token;
  }

  private eat() {
    const prev = this.tokens.shift() as Token;

    return prev;
  }

  private expect(type: TokenType, err: string) {
    const prev = this.eat();

    if (!prev || prev.type != type) {
      LogError(`On line ${prev.line}: Kin Error: ${err}`);
      process.exit(1);
    }

    return prev;
  }

  public produceAST(sourceCodes: string): Program {
    const lexer = new Lexer(sourceCodes);
    this.tokens = lexer.tokenize();

    const program: Program = {
      kind: 'Program',
      body: [],
    };

    // Parse until the EOF
    while (this.not_eof()) {
      program.body.push(this.parse_stmt());
    }

    return program;
  }

  private parse_stmt(): Stmt {
    switch (this.at().type) {
      case TokenType.REKA:
      case TokenType.NTAHINDUKA:
        return this.parse_var_declaration();
      case TokenType.NIBA:
        return this.parse_if_statement();
      case TokenType.SUBIRAMO_NIBA:
        return this.parse_loop_statement();
      case TokenType.POROGARAMU_NTOYA:
        return this.parse_function_declaration();
      default:
        return this.parse_expr();
    }
  }

  private parse_block_statement(): Stmt[] {
    this.expect(
      TokenType.OPEN_CURLY_BRACES,
      `"Expected { starting a code block"`,
    );
    const body: Stmt[] = [];
    while (this.not_eof() && this.at().type != TokenType.CLOSE_CURLY_BRACES) {
      body.push(this.parse_stmt());
    }

    this.expect(
      TokenType.CLOSE_CURLY_BRACES,
      `"Expected } while parsing code block"`,
    );

    return body;
  }

  private parse_var_declaration(): Stmt {
    const isConstant = this.eat().type == TokenType.NTAHINDUKA;
    const identifier = this.expect(
      TokenType.IDENTIFIER,
      `"Variable name expected following "reka" "ntahinduka" statements."`,
    ).lexeme;

    // Un initialized variable
    if (this.at().type == TokenType.SEMI_COLON) {
      this.eat();

      if (isConstant) throw 'Constant variables must be assigned a value';

      return {
        kind: 'VariableDeclaration',
        constant: false,
        identifier,
        value: undefined,
      } as VariableDeclaration;
    }

    this.eat(); // eat =

    // Initialized variable
    const declaration = {
      kind: 'VariableDeclaration',
      constant: isConstant,
      identifier,
      value: this.parse_expr(),
    } as VariableDeclaration;

    return declaration;
  }

  // ! reka obj.key = value  : will work
  // ! reka obj["key"] = value : will not work
  // ! This is to avoid arrays to assign values to undefined indexes, since arrays are objects
  private parse_expr(): Expr {
    return this.parse_assignment_expr();
  }

  private parse_primary_expr(): Expr {
    const tk = this.at().type;
    switch (tk) {
      case TokenType.IDENTIFIER:
        const identifier_expr = {
          kind: 'Identifier',
          symbol: this.eat().lexeme,
        } as Identifier;

        return identifier_expr;
      case TokenType.INTEGER:
        const nbr_literal: Expr = {
          kind: 'NumericLiteral',
          value: parseFloat(this.eat().lexeme),
        } as NumericLiteral;

        return nbr_literal;
      case TokenType.STRING:
        const string_literal = {
          kind: 'StringLiteral',
          value: this.eat().lexeme,
        } as StringLiteral;

        return string_literal;
      case TokenType.OPEN_PARANTHESES:
        this.eat(); // eat the opening paren
        const value = this.parse_expr();

        this.expect(
          TokenType.CLOSE_PARANTHESES,
          'Unexpected token (?) found while parsing arguments.',
        ); // closing paren

        return value;
      case TokenType.TANGA:
        return this.parse_function_return();
      default:
        LogError(
          `On line ${this.at().line}: Kin Error: Unexpected token ${this.at().lexeme}`,
        );
        process.exit(1);
    }
  }

  private parse_and_statement(): Expr {
    let left = this.parse_additive_expr();

    if (['&&', '||'].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_additive_expr();

      left = {
        kind: 'BinaryExpr',
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    return left;
  }

  private parse_additive_expr(): Expr {
    let left = this.parse_multiplicative_expr();

    while (
      ['+', '-', '==', '!=', '<', '>', '<=', '>='].includes(this.at().lexeme)
    ) {
      const operator = this.eat().lexeme;
      const right = this.parse_multiplicative_expr();
      left = {
        kind: 'BinaryExpr',
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    return left;
  }

  // foo.x()
  private parse_call_member_expr(): Expr {
    const member = this.parse_member_expr();

    if (this.at().type == TokenType.OPEN_PARANTHESES) {
      return this.parse_call_expr(member);
    }

    return member;
  }

  private parse_call_expr(caller: Expr): Expr {
    let call_expr: Expr = {
      kind: 'CallExpression',
      caller,
      args: this.parse_args(),
    } as CallExpr;

    // allow chaining: foo.x()()
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

      // non-computed values (obj.expr)
      if (operator.type == TokenType.DOT) {
        computed = false;
        // get identifier
        property = this.parse_primary_expr();

        if (property.kind !== 'Identifier') {
          throw 'Dot operator (".") is illegal without right-hand-side (<-) being an Identifier.';
        }
      } // computed values (obj[computedVal])
      else {
        computed = true;
        property = this.parse_expr();

        this.expect(
          TokenType.CLOSE_BRACKET,
          'Closing bracket ("}") expected following "computed value" in "Member" expression.',
        );
      }

      object = {
        kind: 'MemberExpression',
        object,
        property,
        computed,
      } as MemberExpr;
    }

    return object;
  }

  private parse_multiplicative_expr(): Expr {
    let left = this.parse_call_member_expr();

    while (['/', '*', '%'].includes(this.at().lexeme)) {
      const operator = this.eat().lexeme;
      const right = this.parse_call_member_expr();
      left = {
        kind: 'BinaryExpr',
        left,
        right,
        operator,
      } as BinaryExpr;
    }

    return left;
  }

  private parse_array_expr(): Expr {
    if (this.at().type !== TokenType.OPEN_BRACKET) {
      return this.parse_and_statement();
    }
    this.eat(); // eat [ token
    const properties = new Array<Property>();
    let index = 0; // arr index starts at 0;
    while (this.not_eof() && this.at().type != TokenType.CLOSE_BRACKET) {
      // [val, val2]
      const value: Expr = this.parse_expr();
      const property: Property = {
        key: index.toString(),
        value,
        kind: 'Property',
      } as Property;
      properties.push(property);

      index += 1; // increment the index

      if (this.at().type != TokenType.CLOSE_BRACKET) {
        this.expect(
          TokenType.COMMA,
          `"Closing bracket ']' expected at the end of array expression"`,
        );
      }
    }

    this.expect(
      TokenType.CLOSE_BRACKET,
      `"Closing bracket ']' expected at the end of array expression"`,
    );

    return { kind: 'ObjectLiteral', properties } as ObjectLiteral;
  }

  private parse_object_expr(): Expr {
    if (this.at().type !== TokenType.OPEN_CURLY_BRACES) {
      return this.parse_array_expr();
    }

    this.eat(); // advance past {

    const properties = new Array<Property>();

    while (this.not_eof() && this.at().type != TokenType.CLOSE_CURLY_BRACES) {
      // {key: val, key2: val}
      const key = this.expect(
        TokenType.IDENTIFIER,
        `"Identifier Expected for object key"`,
      ).lexeme;

      // Allow shorthand key: pair -> {key, }
      if (this.at().type == TokenType.COMMA) {
        this.eat(); // advance past comma (,)
        properties.push({ key, kind: 'Property' });
        continue;
      } else if (this.at().type == TokenType.CLOSE_CURLY_BRACES) {
        properties.push({ key, kind: 'Property' });
        continue;
      }

      // {key: val}
      this.expect(TokenType.COLON, `"Expected colon (:) after key ${key}"`);
      const value = this.parse_expr();

      properties.push({ key, value, kind: 'Property' });

      if (this.at().type != TokenType.CLOSE_CURLY_BRACES) {
        this.expect(
          TokenType.COMMA,
          `"Closing brace '}' expected at the end of object expression"`,
        );
      }
    }

    this.expect(
      TokenType.CLOSE_CURLY_BRACES,
      `"Closing brace '}' expected at the end of object expression"`,
    );

    return { kind: 'ObjectLiteral', properties } as ObjectLiteral;
  }

  private parse_if_statement(): Stmt {
    this.eat(); // advance past niba or nanone_niba
    this.expect(TokenType.OPEN_PARANTHESES, `"Expected ( after niba"`);
    const condition: Stmt = this.parse_expr();
    this.expect(TokenType.CLOSE_PARANTHESES, `"Expected ) after condition"`);
    const body: Stmt[] = this.parse_block_statement();
    let alternate: Stmt[] = [];

    if (this.at().type == TokenType.NANONE_NIBA) {
      alternate = [this.parse_if_statement()];
    } else if (this.at().type == TokenType.NIBA_BYANZE) {
      this.eat(); // advance past niba_byanze
      alternate = this.parse_block_statement();
    }

    return {
      kind: 'ConditionalStatement',
      body,
      condition,
      alternate,
    } as ConditionalStmt;
  }

  private parse_loop_statement(): Stmt {
    this.eat(); // advance past subiramo_niba
    this.expect(TokenType.OPEN_PARANTHESES, `"Expected ( after subiramo_niba"`);
    const condition: Stmt = this.parse_expr();
    this.expect(TokenType.CLOSE_PARANTHESES, `"Expected ) after condition"`);
    const body: Stmt[] = this.parse_block_statement();

    return {
      kind: 'LoopStatement',
      body,
      condition,
    } as LoopStatement;
  }

  private parse_function_declaration(): Stmt {
    this.eat(); // eat porogaramu_ntoya keywork
    const name = this.expect(
      TokenType.IDENTIFIER,
      `"Expected function name following porogaramu_ntoya keyword"`,
    ).lexeme;

    const args = this.parse_args();
    const params: string[] = new Array<string>();

    for (const arg of args) {
      if (arg.kind != 'Identifier') {
        LogError(
          `On line ${this.at().line}: Kin Error: Expected identifier for function parameter`,
        );
        process.exit(1);
      }

      params.push((arg as Identifier).symbol);
    }

    const body = this.parse_block_statement();

    return {
      kind: 'FunctionDeclaration',
      name,
      parameters: params,
      body,
    } as FunctionDeclaration;
  }

  private parse_args(): Expr[] {
    this.expect(TokenType.OPEN_PARANTHESES, `"Expected ( after function name"`);
    const args =
      this.at().type == TokenType.CLOSE_PARANTHESES
        ? new Array<Expr>()
        : this.parse_args_list();

    this.expect(
      TokenType.CLOSE_PARANTHESES,
      `"Expected ) after function parameters"`,
    );

    return args;
  }

  private parse_args_list() {
    const args: Expr[] = [this.parse_assignment_expr()];

    while (this.at().type == TokenType.COMMA && this.eat()) {
      args.push(this.parse_assignment_expr());
    }
    return args;
  }

  private parse_assignment_expr(): Expr {
    const left = this.parse_object_expr();
    if (this.at().type == TokenType.EQUAL) {
      this.eat(); // advance past the equals
      const value = this.parse_assignment_expr();

      return {
        kind: 'AssignmentExpression',
        value,
        assigne: left,
      } as AssignmentExpr;
    }

    return left;
  }

  private parse_function_return(): Expr {
    this.eat(); // advance past tanga
    if (this.at().type == TokenType.SEMI_COLON) {
      return { kind: 'ReturnExpr', value: undefined } as Expr;
    }
    const value = this.parse_expr();
    return {
      kind: 'ReturnExpr',
      value,
    } as ReturnExpr;
  }
}
