import { describe, test, expect } from 'vitest';
import Parser from '../src/parser/parser';

function generateDeclarations(lines: number): string {
  const parts: string[] = [];
  for (let i = 0; i < lines; i++) {
    parts.push(`reka v${i} = ${i} + 1`);
  }
  return parts.join('\n');
}

describe('parser performance', () => {
  test('parses 20,000 lines of declarations in under 2 seconds', () => {
    const source = generateDeclarations(20_000);
    const parser = new Parser();
    const start = Date.now();
    const ast = parser.produceAST(source);
    const elapsed = Date.now() - start;

    expect(ast.body.length).toBe(20_000);
    expect(elapsed).toBeLessThan(2000);
  });
});
