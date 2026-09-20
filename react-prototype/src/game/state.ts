import type { GameState, Stats } from './types';
import { SLEEP_DEFAULT, TERM_DAYS } from './constants';
import { generateTerm } from './generate';
import { morningEnergy } from './yields';

export const STARTING_STATS: Omit<Stats, 'energy'> = {
  money: 600,
  intelligence: 20,
  physicality: 20,
  popularity: 20,
};

export function newRun(seed: number): GameState {
  const sleep = new Array<number>(TERM_DAYS).fill(SLEEP_DEFAULT);
  const stats: Stats = { ...STARTING_STATS, energy: 0 };
  stats.energy = morningEnergy(stats, sleep[0]);
  return { version: 2, seed, today: 0, blocks: generateTerm(seed), nextId: 1, stats, sleep };
}
