/** Placement validity and grid mutations. Pure: every function returns a new state. */
import type { Block, GameState } from './types';
import { HORIZON_DAYS, HOURS_PER_DAY, TERM_DAYS } from './constants';
import { cardDef } from './cards';
import { isFree } from './grid';

export type Result = { ok: true; state: GameState } | { ok: false; reason: string };

export function horizonDays(state: GameState): number[] {
  const days: number[] = [];
  for (let d = state.today; d < state.today + HORIZON_DAYS && d < TERM_DAYS; d++) days.push(d);
  return days;
}

/** Today is locked; planning happens from tomorrow to the horizon edge. */
export function isPlannableDay(state: GameState, day: number): boolean {
  return day > state.today && day < state.today + HORIZON_DAYS && day < TERM_DAYS;
}

/** Generous snapping: a card dropped too low slides up to fit. */
export function clampStart(start: number, length: number): number {
  return Math.max(0, Math.min(start, HOURS_PER_DAY - length));
}

export function canMove(state: GameState, block: Block): boolean {
  return (block.source === 'activity' || block.source === 'offer') && isPlannableDay(state, block.day);
}

/** null if the placement is valid, otherwise the reason. */
export function placementError(
  state: GameState,
  length: number,
  day: number,
  start: number,
  ignoreId?: string,
): string | null {
  if (!isPlannableDay(state, day)) return day === state.today ? 'Today is locked' : 'Outside the horizon';
  if (start < 0 || start + length > HOURS_PER_DAY) return 'Does not fit in the day';
  if (!isFree(state.blocks, day, start, length, ignoreId)) return 'Overlaps another block';
  return null;
}

export function placeCard(state: GameState, cardId: string, day: number, start: number): Result {
  const def = cardDef(cardId);
  if (def.supply === 'fixed' || def.supply === 'debt') return { ok: false, reason: 'Not a playable card' };
  const err = placementError(state, def.blocks, day, start);
  if (err) return { ok: false, reason: err };
  const block: Block = {
    id: `p${state.nextId}`,
    cardId,
    day,
    start,
    length: def.blocks,
    source: def.supply === 'offer' ? 'offer' : 'activity',
  };
  return { ok: true, state: { ...state, blocks: [...state.blocks, block], nextId: state.nextId + 1 } };
}

export function moveBlock(state: GameState, blockId: string, day: number, start: number): Result {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return { ok: false, reason: 'No such block' };
  if (!canMove(state, block)) return { ok: false, reason: 'Block is locked' };
  const err = placementError(state, block.length, day, start, blockId);
  if (err) return { ok: false, reason: err };
  return {
    ok: true,
    state: { ...state, blocks: state.blocks.map((b) => (b.id === blockId ? { ...b, day, start } : b)) },
  };
}

export function removeBlock(state: GameState, blockId: string): Result {
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return { ok: false, reason: 'No such block' };
  if (!canMove(state, block)) return { ok: false, reason: 'Block is locked' };
  return { ok: true, state: { ...state, blocks: state.blocks.filter((b) => b.id !== blockId) } };
}

export function isTermOver(state: GameState): boolean {
  return state.today >= TERM_DAYS - 1;
}

/** M0: just slides the window. Resolution arrives in M1. */
export function advanceDay(state: GameState): GameState {
  if (isTermOver(state)) return state;
  return { ...state, today: state.today + 1 };
}
