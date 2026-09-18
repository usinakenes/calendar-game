import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { CARD_LIST } from './cards';

it('src/game has no React or UI imports', () => {
  const dir = __dirname;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(join(dir, file), 'utf8');
    expect(src, file).not.toMatch(/from ['"](react|react-dom|@dnd-kit\/[^'"]+)['"]/);
    expect(src, file).not.toMatch(/from ['"]\.\.\/ui/);
  }
});

it('card data is well-formed', () => {
  const ids = new Set<string>();
  for (const c of CARD_LIST) {
    expect(ids.has(c.id), c.id).toBe(false);
    ids.add(c.id);
    expect(c.blocks, c.id).toBeGreaterThanOrEqual(1);
    expect(c.blocks, c.id).toBeLessThanOrEqual(5);
  }
});
