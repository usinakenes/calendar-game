/**
 * Day resolution — the heart of the game. Iterates hours in order; doesn't care
 * where a block came from.
 */
import type { Block, GameState, Stats, Trait } from './types';
import { TRAITS } from './types';
import { HOURS_PER_DAY, TERM_DAYS } from './constants';
import { cardDef } from './cards';
import { occupancy } from './grid';
import { advanceDay } from './rules';
import { EXHAUSTED_YIELD, IDLE_ENERGY_PER_HOUR, energyCap, energyCostOf, morningEnergy, yieldOf } from './yields';

export type Gains = Record<Trait, number>;

export interface HourLog {
  hour: number;
  blockId: string | null;
  energyBefore: number;
  energyAfter: number;
  /** Worked this hour on an empty tank. */
  exhausted: boolean;
  gains: Gains;
  money: number;
}

export type DayEvent =
  | { kind: 'blockEnd'; hour: number; blockId: string; gains: Gains; money: number }
  | { kind: 'outOfEnergy'; hour: number };

export interface DayResult {
  day: number;
  startEnergy: number;
  hours: HourLog[];
  events: DayEvent[];
  /** Stats after the day, energy included (before the next morning's reset). */
  endStats: Stats;
  totals: Gains & { money: number };
}

const zeroGains = (): Gains => ({ intelligence: 0, physicality: 0, popularity: 0 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const clampTrait = (n: number) => Math.max(0, Math.min(100, round2(n)));

/** Pure simulation of one day. Used both to resolve today and to project future days. */
export function simulateDay(stats: Stats, blocks: readonly Block[], day: number): DayResult {
  const cells = occupancy(blocks, day);
  const cap = energyCap(stats);
  let energy = stats.energy;
  let outOfEnergy = false;
  const hours: HourLog[] = [];
  const events: DayEvent[] = [];
  const totals = { ...zeroGains(), money: 0 };
  const blockGains = new Map<string, { gains: Gains; money: number }>();

  for (let h = 0; h < HOURS_PER_DAY; h++) {
    const block = cells[h];
    const def = block ? cardDef(block.cardId) : null;
    const before = energy;
    const exhausted = before <= 0 && def !== null && def.energy > 0;
    const cost = def ? energyCostOf(def, stats) : IDLE_ENERGY_PER_HOUR;
    energy = Math.max(0, Math.min(cap, before - cost));

    const gains = zeroGains();
    let money = 0;
    if (def && block) {
      const mult = exhausted ? EXHAUSTED_YIELD : 1;
      for (const t of TRAITS) gains[t] = yieldOf(def, t) * mult;
      // Money lands when the card starts, exhausted or not — you still showed up.
      if (h === block.start) money = def.money ?? 0;
      const acc = blockGains.get(block.id) ?? { gains: zeroGains(), money: 0 };
      for (const t of TRAITS) acc.gains[t] += gains[t];
      acc.money += money;
      blockGains.set(block.id, acc);
      if (h === block.start + block.length - 1) {
        events.push({ kind: 'blockEnd', hour: h, blockId: block.id, gains: acc.gains, money: acc.money });
      }
    }
    for (const t of TRAITS) totals[t] += gains[t];
    totals.money += money;

    if (!outOfEnergy && before > 0 && energy <= 0) {
      outOfEnergy = true;
      events.push({ kind: 'outOfEnergy', hour: h });
    }
    if (energy > 0) outOfEnergy = false;
    hours.push({ hour: h, blockId: block?.id ?? null, energyBefore: before, energyAfter: energy, exhausted, gains, money });
  }

  const endStats: Stats = {
    energy: Math.round(energy),
    money: stats.money + totals.money,
    intelligence: clampTrait(stats.intelligence + totals.intelligence),
    physicality: clampTrait(stats.physicality + totals.physicality),
    popularity: clampTrait(stats.popularity + totals.popularity),
  };
  return { day, startEnergy: stats.energy, hours, events, endStats, totals };
}

/** Resolve today, then move to tomorrow and wake up with last night's sleep. */
export function resolveDay(state: GameState): { state: GameState; result: DayResult } {
  const result = simulateDay(state.stats, state.blocks, state.today);
  const next = advanceDay(state);
  if (next.today === state.today || next.today >= TERM_DAYS) {
    return { state: { ...state, stats: result.endStats }, result };
  }
  const stats = { ...result.endStats };
  stats.energy = morningEnergy(stats, next.sleep[next.today]);
  return { state: { ...next, stats }, result };
}
