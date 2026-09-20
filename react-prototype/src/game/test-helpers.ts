import type { GameState } from './types';

/** An empty run on day 0 with default stats. Tests only. */
export function blank(): GameState {
  return {
    version: 2,
    seed: 0,
    today: 0,
    blocks: [],
    nextId: 1,
    stats: { energy: 86, money: 600, intelligence: 20, physicality: 20, popularity: 20 },
    sleep: new Array(84).fill(8),
  };
}
