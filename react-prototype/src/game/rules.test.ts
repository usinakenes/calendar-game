import { describe, expect, it } from 'vitest';
import type { GameState } from './types';
import { advanceDay, clampStart, moveBlock, placeCard, removeBlock } from './rules';

function blank(): GameState {
  return { version: 1, seed: 0, today: 0, blocks: [], nextId: 1 };
}

describe('placement', () => {
  it('places a card with its fixed length', () => {
    const r = placeCard(blank(), 'study_focused', 1, 2);
    expect(r.ok && r.state.blocks[0]).toMatchObject({ day: 1, start: 2, length: 3, source: 'activity' });
  });

  it('rejects today, beyond the horizon, and overflow', () => {
    expect(placeCard(blank(), 'gym', 0, 0).ok).toBe(false);
    expect(placeCard(blank(), 'gym', 7, 0).ok).toBe(false);
    expect(placeCard(blank(), 'gym', 6, 0).ok).toBe(true);
    expect(placeCard(blank(), 'cram', 1, 10).ok).toBe(false);
  });

  it('rejects overlap and fixed cards', () => {
    const r = placeCard(blank(), 'study_focused', 1, 2);
    if (!r.ok) throw new Error();
    expect(placeCard(r.state, 'gym', 1, 4).ok).toBe(false);
    expect(placeCard(r.state, 'gym', 1, 5).ok).toBe(true);
    expect(placeCard(blank(), 'lecture', 1, 0).ok).toBe(false);
  });

  it('moves a block, ignoring its own cells', () => {
    const r = placeCard(blank(), 'study_focused', 1, 2);
    if (!r.ok) throw new Error();
    const m = moveBlock(r.state, 'p1', 1, 3);
    expect(m.ok && m.state.blocks[0].start).toBe(3);
  });

  it('locks blocks once their day becomes today', () => {
    const r = placeCard(blank(), 'gym', 1, 0);
    if (!r.ok) throw new Error();
    const s = advanceDay(r.state);
    expect(moveBlock(s, 'p1', 2, 0).ok).toBe(false);
    expect(removeBlock(s, 'p1').ok).toBe(false);
    expect(removeBlock(r.state, 'p1').ok).toBe(true);
  });

  it('snaps starts into the day', () => {
    expect(clampStart(12, 3)).toBe(11);
    expect(clampStart(-1, 2)).toBe(0);
  });
});
