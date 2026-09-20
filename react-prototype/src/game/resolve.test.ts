import { describe, expect, it } from 'vitest';
import type { Block, Stats } from './types';
import { resolveDay, simulateDay } from './resolve';
import { placeCard, setSleep } from './rules';
import { IDLE_ENERGY_PER_HOUR, energyCap, morningEnergy } from './yields';
import { newRun } from './state';
import { blank } from './test-helpers';

const stats: Stats = { energy: 80, money: 100, intelligence: 20, physicality: 0, popularity: 20 };
const block = (cardId: string, start: number, length: number, id = cardId): Block => ({
  id,
  cardId,
  day: 0,
  start,
  length,
  source: 'activity',
});

describe('simulateDay', () => {
  it('an empty day only costs idle energy', () => {
    const r = simulateDay(stats, [], 0);
    expect(r.endStats.energy).toBe(80 - 14 * IDLE_ENERGY_PER_HOUR);
    expect(r.events).toEqual([]);
  });

  it('pays traits per hour and money when a card starts', () => {
    const r = simulateDay(stats, [block('study_focused', 0, 3), block('dinner', 5, 2)], 0);
    expect(r.totals.intelligence).toBeCloseTo(0.3);
    expect(r.totals.popularity).toBeCloseTo(0.24);
    expect(r.endStats.money).toBe(55);
    expect(r.events.filter((e) => e.kind === 'blockEnd')).toHaveLength(2);
  });

  it('running out of energy cuts later output to a trickle', () => {
    const low = { ...stats, energy: 20 };
    const r = simulateDay(low, [block('study_focused', 0, 3), block('cram', 3, 5)], 0);
    expect(r.events).toContainEqual({ kind: 'outOfEnergy', hour: 2 });
    expect(r.hours[7].exhausted).toBe(true);
    // 3h focused at full rate, cram almost nothing.
    expect(r.totals.intelligence).toBeLessThan(0.3 + 5 * 0.09 * 0.2);
  });

  it('rest restores energy, capped', () => {
    const r = simulateDay({ ...stats, energy: 10 }, [block('rest', 0, 1)], 0);
    expect(r.hours[0].energyAfter).toBe(18);
    const full = simulateDay({ ...stats, energy: energyCap(stats) }, [block('rest', 0, 1)], 0);
    expect(full.hours[0].energyAfter).toBe(energyCap(stats));
  });
});

describe('resolveDay', () => {
  it('advances, applies the day, and wakes with last night’s sleep', () => {
    let s = newRun(1);
    const r1 = setSleep(s, 1, 10);
    if (!r1.ok) {
      // Seed 1 might have an 08:00 event on day 1; fall back to 6h.
      const r2 = setSleep(s, 1, 6);
      if (!r2.ok) throw new Error();
      s = r2.state;
    } else s = r1.state;
    const { state, result } = resolveDay(s);
    expect(state.today).toBe(1);
    expect(result.day).toBe(0);
    expect(state.stats.energy).toBe(morningEnergy(state.stats, s.sleep[1]));
    expect(state.stats.intelligence).toBeGreaterThan(s.stats.intelligence);
  });

  it('is deterministic', () => {
    const r = placeCard(blank(), 'gym', 1, 3);
    if (!r.ok) throw new Error();
    const a = resolveDay(resolveDay(r.state).state);
    const b = resolveDay(resolveDay(r.state).state);
    expect(a).toEqual(b);
  });
});
