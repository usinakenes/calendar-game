/**
 * Balance harness. Plays full terms with heuristic strategies and prints the
 * numbers that hand-playing can't feel.   npm run harness -- [runs]
 *
 * Each strategy plans tomorrow (its last chance before the day locks) by
 * filling every gap, then resolves today.
 */
import type { GameState } from '../src/game/types';
import { TRAITS } from '../src/game/types';
import { HOURS_PER_DAY, TERM_DAYS } from '../src/game/constants';
import { cardDef } from '../src/game/cards';
import { gapsForDay } from '../src/game/grid';
import { placeCard } from '../src/game/rules';
import { resolveDay, simulateDay } from '../src/game/resolve';
import { newRun } from '../src/game/state';
import { morningEnergy } from '../src/game/yields';
import { mulberry32, pick, type Rng } from '../src/game/rng';

type Planner = (state: GameState, day: number, rng: Rng) => GameState;

/** Fill each gap front to back with the first preferred card that fits. */
function greedy(prefs: (gapLeft: number, i: number) => string[]): Planner {
  return (state, day) => {
    let i = 0;
    for (const gap of gapsForDay(state.blocks, day)) {
      let start = gap.start;
      const end = gap.start + gap.length;
      while (start < end) {
        const cardId = prefs(end - start, i++).find((id) => cardDef(id).blocks <= end - start);
        if (!cardId) break;
        const r = placeCard(state, cardId, day, start);
        if (!r.ok) break;
        state = r.state;
        start += cardDef(cardId).blocks;
      }
    }
    return state;
  };
}

const rotation = [['study_focused', 'study_light'], ['gym', 'rest'], ['dinner', 'coffee'], ['rest']];

/** Balanced, but stops before the tank runs dry and rests instead. */
const energyAware: Planner = (state, day, rng) => {
  const planned = greedy((_, i) => rotation[i % rotation.length])(state, day, rng);
  const projected = simulateDay(
    { ...planned.stats, energy: morningEnergy(planned.stats, planned.sleep[day]) },
    planned.blocks,
    day,
  );
  if (!projected.events.some((e) => e.kind === 'outOfEnergy')) return planned;
  // Swap the day's plan for study + rest alternation.
  return greedy((_, i) => (i % 2 === 0 ? ['study_focused', 'study_light'] : ['rest']))(state, day, rng);
};

const PLACEABLE = ['study_light', 'study_focused', 'cram', 'gym', 'rest', 'chores', 'shift', 'short_shift', 'coffee', 'dinner', 'night_out'];

const STRATEGIES: Record<string, Planner> = {
  idle: (s) => s,
  'all-study': greedy(() => ['study_focused', 'study_light']),
  'all-work': greedy(() => ['shift', 'short_shift']),
  'all-social': greedy(() => ['night_out', 'dinner', 'coffee']),
  'all-gym': greedy(() => ['gym', 'rest']),
  balanced: greedy((_, i) => rotation[i % rotation.length].concat('rest')),
  'energy-aware': energyAware,
  random: (state, day, rng) => greedy(() => [pick(rng, PLACEABLE), 'rest'])(state, day, rng),
};

interface RunStats {
  final: GameState['stats'];
  exhaustedHoursPerDay: number;
  daysOutOfEnergy: number;
  avgEndEnergy: number;
  minMoney: number;
}

function play(seed: number, plan: Planner): RunStats {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let state = newRun(seed);
  let exhausted = 0;
  let daysOut = 0;
  let endEnergy = 0;
  let minMoney = state.stats.money;
  for (let d = 0; d < TERM_DAYS; d++) {
    if (state.today + 1 < TERM_DAYS) state = plan(state, state.today + 1, rng);
    const { state: next, result } = resolveDay(state);
    exhausted += result.hours.filter((h) => h.exhausted).length;
    if (result.events.some((e) => e.kind === 'outOfEnergy')) daysOut++;
    endEnergy += result.endStats.energy;
    minMoney = Math.min(minMoney, result.endStats.money);
    state = next;
  }
  return {
    final: state.stats,
    exhaustedHoursPerDay: exhausted / TERM_DAYS,
    daysOutOfEnergy: daysOut,
    avgEndEnergy: endEnergy / TERM_DAYS,
    minMoney,
  };
}

const runs = Number(process.argv[2] ?? 100);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f = (n: number, w = 7, dp = 1) => n.toFixed(dp).padStart(w);

console.log(`${runs} runs × ${TERM_DAYS} days per strategy (start: traits 20, money 600, 8h sleep)\n`);
console.log(
  'strategy'.padEnd(14) +
    ['INT', 'PHY', 'POP', 'money', 'minMoney', 'daysOut', 'exh h/d', 'endE'].map((h) => h.padStart(9)).join(''),
);
for (const [name, plan] of Object.entries(STRATEGIES)) {
  const results = Array.from({ length: runs }, (_, i) => play(i + 1, plan));
  const row = [
    ...TRAITS.map((t) => mean(results.map((r) => r.final[t]))),
    mean(results.map((r) => r.final.money)),
    mean(results.map((r) => r.minMoney)),
    mean(results.map((r) => r.daysOutOfEnergy)),
    mean(results.map((r) => r.exhaustedHoursPerDay)),
    mean(results.map((r) => r.avgEndEnergy)),
  ];
  console.log(name.padEnd(14) + row.map((n, i) => f(n, 9, i === 3 || i === 4 ? 0 : 1)).join(''));
}
console.log(`\ndaysOut = days (of ${TERM_DAYS}) the tank hit 0 · exh h/d = hours/day worked on empty · endE = energy left at 22:00`);
console.log(`(${HOURS_PER_DAY} blocks/day; traits cap at 100)`);
