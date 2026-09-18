/**
 * Fixed-event generator. Owns grid density and gap shapes.
 *
 * Two layers:
 *  1. A term timetable (lectures, tutorials, a lab) that repeats every week.
 *  2. Per-week variation (shifts, one-offs, the odd cancelled lecture) so the
 *     gap shapes differ week to week even with an identical timetable.
 *
 * Each layer generates several candidates and keeps the one with the most
 * interesting gaps (see gapScore). Candidates outside the density band are
 * only used if nothing lands inside it.
 */
import type { Block } from './types';
import {
  DAYS_PER_WEEK,
  FIXED_DENSITY_MAX,
  FIXED_DENSITY_MIN,
  HOURS_PER_DAY,
  TERM_WEEKS,
} from './constants';
import { freeRuns } from './grid';
import { mulberry32, pick, randInt, shuffle, type Rng } from './rng';

export interface Slot {
  weekday: number;
  start: number;
  length: number;
  cardId: string;
  label?: string;
}

type WeekGrid = boolean[][];

const COURSE_NAMES = [
  'Linear Algebra',
  'Macroeconomics',
  'Organic Chemistry',
  'Intro Psychology',
  'Data Structures',
  'Medieval History',
  'Statistics',
  'Philosophy of Mind',
];

const COURSES_PER_TERM = 4;
const TIMETABLE_CANDIDATES = 12;
const WEEK_CANDIDATES = 16;
const WEEKDAYS = [0, 1, 2, 3, 4];

function emptyWeek(): WeekGrid {
  return Array.from({ length: DAYS_PER_WEEK }, () => new Array<boolean>(HOURS_PER_DAY).fill(false));
}

export function gridOf(slots: readonly Slot[]): WeekGrid {
  const grid = emptyWeek();
  for (const s of slots) for (let h = s.start; h < s.start + s.length; h++) grid[s.weekday][h] = true;
  return grid;
}

function fits(grid: WeekGrid, weekday: number, start: number, length: number): boolean {
  if (start < 0 || start + length > HOURS_PER_DAY) return false;
  for (let h = start; h < start + length; h++) if (grid[weekday][h]) return false;
  return true;
}

/** Try up to `attempts` random positions from `propose`; place the first that fits. */
function tryPlace(
  rng: Rng,
  slots: Slot[],
  grid: WeekGrid,
  base: Omit<Slot, 'weekday' | 'start'>,
  propose: (rng: Rng) => { weekday: number; start: number } | null,
  attempts = 30,
): boolean {
  for (let i = 0; i < attempts; i++) {
    const p = propose(rng);
    if (!p || !fits(grid, p.weekday, p.start, base.length)) continue;
    const slot = { ...base, ...p };
    slots.push(slot);
    for (let h = slot.start; h < slot.start + slot.length; h++) grid[slot.weekday][h] = true;
    return true;
  }
  return false;
}

export function weekDensity(slots: readonly Slot[]): number {
  return slots.reduce((n, s) => n + s.length, 0);
}

/**
 * How interesting a week's negative space is. Rewards awkward 1–2h holes
 * sandwiched between commitments, a variety of gap lengths, and a few clear
 * evenings. Punishes blank days and clumped days. Pure heuristic — tune freely.
 */
export function gapScore(grid: WeekGrid): number {
  let awkward = 0;
  let clearEvenings = 0;
  let emptyDays = 0;
  let clumpedDays = 0;
  const lengths = new Set<number>();

  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    const filled = grid[d].filter(Boolean).length;
    if (filled === 0) emptyDays++;
    if (filled >= 10) clumpedDays++;
    for (const r of freeRuns(grid[d])) {
      lengths.add(r.length);
      const sandwiched = r.start > 0 && r.start + r.length < HOURS_PER_DAY;
      if (sandwiched && r.length <= 2) awkward++;
      // Free from 18:00 (hour 10) or earlier through 22:00.
      if (r.start <= 10 && r.start + r.length === HOURS_PER_DAY) clearEvenings++;
    }
  }

  return (
    Math.min(awkward, 4) * 2 +
    lengths.size +
    (clearEvenings >= 1 && clearEvenings <= 4 ? 3 : 0) -
    Math.max(0, emptyDays - 1) * 3 -
    clumpedDays * 3
  );
}

function makeTimetable(rng: Rng): Slot[] | null {
  const slots: Slot[] = [];
  const grid = emptyWeek();
  const courses = shuffle(rng, COURSE_NAMES).slice(0, COURSES_PER_TERM);

  for (const course of courses) {
    const used = new Set<number>();
    const onFreeWeekday = (startMin: number, startMax: number) => (r: Rng) => {
      const weekday = pick(r, WEEKDAYS);
      return used.has(weekday) ? null : { weekday, start: randInt(r, startMin, startMax) };
    };
    // Two lectures on different weekdays, starting 08:00–16:00.
    for (let i = 0; i < 2; i++) {
      if (!tryPlace(rng, slots, grid, { cardId: 'lecture', length: 2, label: course }, onFreeWeekday(0, 8))) return null;
      used.add(slots[slots.length - 1].weekday);
    }
    // One tutorial, 09:00–17:00, on a third day. 1h fragments make awkward holes.
    if (!tryPlace(rng, slots, grid, { cardId: 'tutorial', length: 1, label: course }, onFreeWeekday(1, 9))) return null;
  }

  // One course has a weekly lab in the afternoon.
  const labCourse = pick(rng, courses);
  const placedLab = tryPlace(rng, slots, grid, { cardId: 'lab', length: 3, label: labCourse }, (r) => ({
    weekday: pick(r, WEEKDAYS),
    start: randInt(r, 4, 8),
  }));
  return placedLab ? slots : null;
}

function weekVariation(rng: Rng, timetable: readonly Slot[]): Slot[] {
  const slots = timetable.slice();

  // Occasionally a lecture is cancelled, opening an unexpected hole.
  if (rng() < 0.2) {
    const lectures = slots.filter((s) => s.cardId === 'lecture');
    slots.splice(slots.indexOf(pick(rng, lectures)), 1);
  }

  const grid = gridOf(slots);

  // 1–2 fixed shifts. Weekday shifts are evenings; weekend shifts can wreck a day.
  const shifts = randInt(rng, 1, 2);
  for (let i = 0; i < shifts; i++) {
    tryPlace(rng, slots, grid, { cardId: 'shift', length: 4, label: 'Café' }, (r) => {
      const weekday = randInt(r, 0, 6);
      return { weekday, start: weekday >= 5 ? randInt(r, 0, 8) : randInt(r, 8, 10) };
    });
  }

  // 0–3 one-offs, each kind at most once a week.
  for (const kind of shuffle(rng, [0, 1, 2]).slice(0, randInt(rng, 0, 3))) {
    if (kind === 0) {
      tryPlace(rng, slots, grid, { cardId: 'appointment', length: 1, label: pick(rng, ['Dentist', 'GP', 'Advisor']) }, (r) => ({
        weekday: pick(r, WEEKDAYS),
        start: randInt(r, 0, 9),
      }));
    } else if (kind === 1) {
      tryPlace(rng, slots, grid, { cardId: 'club_meeting', length: 2 }, (r) => ({
        weekday: pick(r, WEEKDAYS),
        start: randInt(r, 9, 12),
      }));
    } else {
      tryPlace(rng, slots, grid, { cardId: 'family_visit', length: 3 }, (r) => ({
        weekday: randInt(r, 5, 6),
        start: randInt(r, 2, 10),
      }));
    }
  }

  return slots;
}

function densityDistance(slots: readonly Slot[]): number {
  const n = weekDensity(slots);
  if (n < FIXED_DENSITY_MIN) return FIXED_DENSITY_MIN - n;
  if (n > FIXED_DENSITY_MAX) return n - FIXED_DENSITY_MAX;
  return 0;
}

/** Lowest density distance first, then highest gap score. */
function best(candidates: Slot[][]): Slot[] {
  let bestSlots = candidates[0];
  let bestKey = [Infinity, -Infinity];
  for (const c of candidates) {
    const key = [densityDistance(c), gapScore(gridOf(c))];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      bestSlots = c;
      bestKey = key;
    }
  }
  return bestSlots;
}

export function generateTimetable(rng: Rng): Slot[] {
  const candidates: Slot[][] = [];
  while (candidates.length < TIMETABLE_CANDIDATES) {
    const t = makeTimetable(rng);
    if (t) candidates.push(t);
  }
  // The timetable alone is below the band by design; rank by gaps only.
  return candidates.reduce((a, b) => (gapScore(gridOf(b)) > gapScore(gridOf(a)) ? b : a));
}

export function generateWeek(rng: Rng, timetable: readonly Slot[]): Slot[] {
  const candidates: Slot[][] = [];
  for (let i = 0; i < WEEK_CANDIDATES; i++) candidates.push(weekVariation(rng, timetable));
  return best(candidates);
}

/** Every fixed block for the whole term, deterministic for a seed. */
export function generateTerm(seed: number): Block[] {
  const rng = mulberry32(seed);
  const timetable = generateTimetable(rng);
  const blocks: Block[] = [];
  let n = 0;
  for (let w = 0; w < TERM_WEEKS; w++) {
    for (const s of generateWeek(rng, timetable)) {
      blocks.push({
        id: `f${n++}`,
        cardId: s.cardId,
        day: w * DAYS_PER_WEEK + s.weekday,
        start: s.start,
        length: s.length,
        source: 'fixed',
        label: s.label,
      });
    }
  }
  return blocks;
}
