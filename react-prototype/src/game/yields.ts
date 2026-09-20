/**
 * The named formulas. Every future relic modifies exactly one of these —
 * if a relic needs a branch in resolve.ts, it doesn't ship.
 * M1: flat per-hour rates. M2 adds duration curves, motivation, staleness, the clamp.
 */
import type { CardDef, Stats, Trait } from './types';

/** An awake hour with nothing scheduled still costs something. */
export const IDLE_ENERGY_PER_HOUR = 2;
/** Output multiplier for hours worked with an empty tank. */
export const EXHAUSTED_YIELD = 0.1;

/** Daily energy ceiling. Physicality raises it. */
export function energyCap(stats: Stats): number {
  return Math.round(90 + 0.3 * stats.physicality);
}

/** Fraction of the cap restored by a night of `hours` sleep. */
export function sleepRestore(hours: number): number {
  const table: Record<number, number> = { 4: 0.45, 5: 0.58, 6: 0.7, 7: 0.8, 8: 0.9, 9: 0.97, 10: 1.0 };
  return table[Math.max(4, Math.min(10, Math.round(hours)))];
}

export function morningEnergy(stats: Stats, sleepHours: number): number {
  return Math.round(energyCap(stats) * sleepRestore(sleepHours));
}

/** Energy cost of one hour of this card. Physicality makes physical cards cheaper. */
export function energyCostOf(def: CardDef, stats: Stats): number {
  if (def.physical) return def.energy * (1 - stats.physicality / 250);
  return def.energy;
}

/** Trait gain from one hour of this card. */
export function yieldOf(def: CardDef, trait: Trait): number {
  return def.yields?.[trait] ?? 0;
}
