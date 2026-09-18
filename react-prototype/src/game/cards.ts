import type { CardDef } from './types';
import raw from './data/cards.json';

export const CARD_LIST = raw as CardDef[];

export const CARDS: Record<string, CardDef> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));

export function cardDef(id: string): CardDef {
  const def = CARDS[id];
  if (!def) throw new Error(`Unknown card: ${id}`);
  return def;
}
