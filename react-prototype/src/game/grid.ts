import type { Block } from './types';
import { HOURS_PER_DAY } from './constants';

export interface Gap {
  day: number;
  start: number;
  length: number;
}

export function blocksOnDay(blocks: readonly Block[], day: number): Block[] {
  return blocks.filter((b) => b.day === day);
}

/** One entry per hour: the block occupying it, or null. */
export function occupancy(blocks: readonly Block[], day: number, ignoreId?: string): (Block | null)[] {
  const cells: (Block | null)[] = new Array(HOURS_PER_DAY).fill(null);
  for (const b of blocks) {
    if (b.day !== day || b.id === ignoreId) continue;
    for (let h = b.start; h < b.start + b.length; h++) cells[h] = b;
  }
  return cells;
}

export function isFree(blocks: readonly Block[], day: number, start: number, length: number, ignoreId?: string): boolean {
  if (start < 0 || start + length > HOURS_PER_DAY) return false;
  const cells = occupancy(blocks, day, ignoreId);
  for (let h = start; h < start + length; h++) if (cells[h]) return false;
  return true;
}

/** Maximal runs of free hours in a boolean row (true = filled). */
export function freeRuns(filled: readonly boolean[]): { start: number; length: number }[] {
  const runs: { start: number; length: number }[] = [];
  let start = -1;
  for (let h = 0; h <= filled.length; h++) {
    const free = h < filled.length && !filled[h];
    if (free && start < 0) start = h;
    if (!free && start >= 0) {
      runs.push({ start, length: h - start });
      start = -1;
    }
  }
  return runs;
}

export function gapsForDay(blocks: readonly Block[], day: number): Gap[] {
  return freeRuns(occupancy(blocks, day).map((b) => b !== null)).map((r) => ({ day, ...r }));
}
