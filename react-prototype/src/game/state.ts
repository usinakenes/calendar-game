import type { GameState } from './types';
import { generateTerm } from './generate';

export function newRun(seed: number): GameState {
  return { version: 1, seed, today: 0, blocks: generateTerm(seed), nextId: 1 };
}
