import { describe, expect, it } from 'vitest';
import { generateTerm } from './generate';
import { occupancy } from './grid';
import { DAYS_PER_WEEK, FIXED_DENSITY_MAX, FIXED_DENSITY_MIN, HOURS_PER_DAY, TERM_DAYS, TERM_WEEKS } from './constants';

describe('generateTerm', () => {
  it('is deterministic for a seed', () => {
    expect(generateTerm(42)).toEqual(generateTerm(42));
    expect(generateTerm(42)).not.toEqual(generateTerm(43));
  });

  it('never overlaps and stays inside the grid', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const blocks = generateTerm(seed);
      for (let day = 0; day < TERM_DAYS; day++) {
        const hours = new Array(HOURS_PER_DAY).fill(0);
        for (const b of blocks.filter((b) => b.day === day)) {
          expect(b.start).toBeGreaterThanOrEqual(0);
          expect(b.start + b.length).toBeLessThanOrEqual(HOURS_PER_DAY);
          for (let h = b.start; h < b.start + b.length; h++) hours[h]++;
        }
        expect(Math.max(...hours)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps most weeks inside the 30–40% density band', () => {
    let inBand = 0;
    let weeks = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const blocks = generateTerm(seed);
      for (let w = 0; w < TERM_WEEKS; w++) {
        let filled = 0;
        for (let d = 0; d < DAYS_PER_WEEK; d++) filled += occupancy(blocks, w * 7 + d).filter(Boolean).length;
        if (filled >= FIXED_DENSITY_MIN && filled <= FIXED_DENSITY_MAX) inBand++;
        weeks++;
      }
    }
    expect(inBand / weeks).toBeGreaterThan(0.95);
  });
});
