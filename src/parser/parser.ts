/****************************************
 *              Parser                  *
 *       Product Kin's AST              *
 ****************************************/

import Lexer, { Token } from '../lexer/lexer';
import TokenType from '../lexer/tokens';
import { LogError } from '../utils/log';
import {
  Expr,
  Identifier,
  NumericLiteral,
  ObjectLiteral,
  Program,
  Property,
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
      default:
        return this.parse_expr();
    }
  }

  private parse_var_declaration(): Stmt {
    const isConstant = this.eat().type == TokenType.NTAHINDUKA;
    const identifier = this.expect(
      TokenType.IDENTIFIER,
      `"Variable name expected following "reka" "ntahinduka" statements."`,
    ).lexeme;

    // Un initialized variable
    if (this.at().type == TokenType.END_OF_LINE) {
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

    this.expect(
      TokenType.END_OF_LINE,
      `"Expected semicolon at the end of line"`,
    );

    return declaration;
  }

  private parse_expr(): Expr {
    return this.parse_primary_expr();
  }

  private parse_primary_expr(): Expr {
    switch (this.at().type) {
      case TokenType.IDENTIFIER:
        return { kind: 'Identifier', symbol: this.eat().lexeme } as Identifier;
      case TokenType.INTEGER:
        return {
          kind: 'NumericLiteral',
          value: parseInt(this.eat().lexeme),
        } as NumericLiteral;
      case TokenType.FLOAT:
        return {
          kind: 'NumericLiteral',
          value: parseFloat(this.eat().lexeme),
        } as NumericLiteral;
      case TokenType.STRING:
        return {
          kind: 'StringLiteral',
          value: this.eat().lexeme,
        } as StringLiteral;
      case TokenType.OPEN_CURLY_BRACES:
        this.eat(); // advance past {
        return this.parse_object_expr();
      case TokenType.OPEN_BRACKET:
        this.eat(); // advance past [
        return this.parse_array_expr();
      case TokenType.OPEN_PARANTHESES:
        this.eat(); // advance past (
        const value: Expr = this.parse_expr();
        this.expect(
          TokenType.END_OF_LINE,
          `Expected semicolon at the end of line`,
        );
        return value;
      default:
        LogError(
          `On line ${this.at().line}: Kin Error: Unexpected token ${this.at().lexeme}`,
        );
        process.exit(1);
    }
  }

  private parse_array_expr(): Expr {
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
          `"Semicolor (;) or Closing bracket (]) expected at the end of array expression"`,
        );
      }
    }

    this.eat(); // advance past ]

    return { kind: 'ObjectLiteral', properties } as ObjectLiteral;
  }

  private parse_object_expr(): Expr {
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
      const value: Expr = {
        kind: 'StringLiteral',
        value: this.eat().lexeme,
      } as StringLiteral;

      properties.push({ key, value, kind: 'Property' });

      if (this.at().type != TokenType.CLOSE_CURLY_BRACES) {
        this.expect(
          TokenType.COMMA,
          `"Semicolor (;) or Closing brace (}) expected at the end of object expression"`,
        );
      }
    }

    this.expect(
      TokenType.CLOSE_CURLY_BRACES,
      `"Closing brace (}) expected at the end of object expression"`,
    );

    return { kind: 'ObjectLiteral', properties } as ObjectLiteral;
  }
}
