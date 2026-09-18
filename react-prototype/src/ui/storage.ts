import type { GameState } from '../game/types';
import { newRun } from '../game/state';

const KEY = 'term.save.v1';

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export function loadOrNew(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // Unreadable save: start fresh.
  }
  return newRun(randomSeed());
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; the run just won't persist.
  }
}
