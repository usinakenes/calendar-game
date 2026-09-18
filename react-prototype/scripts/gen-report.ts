/**
 * Prints what the fixed-event generator produces, so gap shapes can be judged
 * without playing.   npm run gen-report -- [seed] [weeks]
 */
import { generateTerm } from '../src/game/generate';
import { gapsForDay, occupancy } from '../src/game/grid';
import { DAYS_PER_WEEK, FIRST_HOUR, HOURS_PER_DAY, TERM_WEEKS, WEEKDAY_NAMES } from '../src/game/constants';

const seed = Number(process.argv[2] ?? 1);
const weeksToShow = Number(process.argv[3] ?? 2);
const blocks = generateTerm(seed);

const glyph: Record<string, string> = {
  lecture: 'L', tutorial: 't', lab: 'B', shift: 'W', appointment: 'a', club_meeting: 'c', family_visit: 'F',
};

for (let w = 0; w < weeksToShow; w++) {
  console.log(`\nSeed ${seed} · week ${w + 1}`);
  console.log('      ' + WEEKDAY_NAMES.map((n) => n.padEnd(4)).join(''));
  const cols = Array.from({ length: DAYS_PER_WEEK }, (_, d) => occupancy(blocks, w * 7 + d));
  for (let h = 0; h < HOURS_PER_DAY; h++) {
    const row = cols.map((c) => (c[h] ? glyph[c[h]!.cardId] ?? '#' : '·').padEnd(4)).join('');
    console.log(`${String(FIRST_HOUR + h).padStart(2, '0')}:00 ${row}`);
  }
  let filled = 0;
  for (const c of cols) filled += c.filter(Boolean).length;
  console.log(`fixed ${filled}/98 (${Math.round((filled / 98) * 100)}%)`);
}

// Aggregate over many seeds.
const N = 500;
const densities: number[] = [];
const gapHist = new Array(HOURS_PER_DAY + 1).fill(0);
for (let s = 1; s <= N; s++) {
  const b = generateTerm(s);
  for (let w = 0; w < TERM_WEEKS; w++) {
    let filled = 0;
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const day = w * 7 + d;
      filled += occupancy(b, day).filter(Boolean).length;
      for (const g of gapsForDay(b, day)) gapHist[g.length]++;
    }
    densities.push(filled);
  }
}
densities.sort((a, b) => a - b);
const pct = (p: number) => densities[Math.floor((densities.length - 1) * p)];
console.log(`\n${N} seeds × ${TERM_WEEKS} weeks: density p5=${pct(0.05)} p50=${pct(0.5)} p95=${pct(0.95)} (of 98)`);
const totalGaps = gapHist.reduce((a, b) => a + b, 0);
console.log('gap length distribution:');
for (let len = 1; len <= HOURS_PER_DAY; len++) {
  const share = gapHist[len] / totalGaps;
  console.log(`  ${String(len).padStart(2)}h ${(share * 100).toFixed(1).padStart(5)}% ${'█'.repeat(Math.round(share * 100))}`);
}
