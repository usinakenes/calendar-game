import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Block, CardDef, GameState } from './game/types';
import { DAYS_PER_WEEK, HOURS_PER_DAY, TERM_DAYS, TERM_WEEKS } from './game/constants';
import { cardDef } from './game/cards';
import { gapsForDay, occupancy } from './game/grid';
import { newRun } from './game/state';
import {
  advanceDay,
  clampStart,
  horizonDays,
  isTermOver,
  moveBlock,
  placeCard,
  placementError,
  removeBlock,
  type Result,
} from './game/rules';
import { Calendar, HEADER_H, LABEL_W, type Preview } from './ui/Calendar';
import { CardDock } from './ui/CardDock';
import { BlockFace } from './ui/BlockFace';
import { WEEKDAY_FULL } from './ui/theme';
import type { Cell, Held } from './ui/interaction';
import { loadOrNew, randomSeed, save } from './ui/storage';

function heldCardId(state: GameState, held: Held): string {
  if (held.kind === 'card') return held.cardId;
  return state.blocks.find((b) => b.id === held.blockId)?.cardId ?? '';
}

function previewFor(state: GameState, held: Held, cell: Cell): Preview {
  const start = clampStart(cell.hour - held.grab, held.length);
  const ignore = held.kind === 'block' ? held.blockId : undefined;
  return {
    day: cell.day,
    start,
    length: held.length,
    name: cardDef(heldCardId(state, held)).name,
    error: placementError(state, held.length, cell.day, start, ignore),
  };
}

function TermProgress({ today }: { today: number }) {
  const week = Math.floor(today / DAYS_PER_WEEK);
  return (
    <div className="flex gap-1" title={`Week ${week + 1} of ${TERM_WEEKS}`}>
      {Array.from({ length: TERM_WEEKS }, (_, w) => {
        const fill = w < week ? 100 : w > week ? 0 : (((today % DAYS_PER_WEEK) + 1) / DAYS_PER_WEEK) * 100;
        return (
          <div key={w} className={`h-2 w-5 overflow-hidden rounded-full bg-white/10 ${w === week ? 'ring-1 ring-yellow-300/60' : ''}`}>
            <div className="h-full bg-yellow-300" style={{ width: `${fill}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState>(loadOrNew);
  const [selected, setSelected] = useState<Held | null>(null);
  const [dragging, setDragging] = useState<Held | null>(null);
  const [pointerCell, setPointerCell] = useState<Cell | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [banner, setBanner] = useState<{ id: number; title: string; sub: string } | null>(null);
  const [showGaps, setShowGaps] = useState(true);
  const [cellSize, setCellSize] = useState({ w: 120, h: 32 });
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => save(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const held = dragging ?? selected;
  const preview = held && pointerCell ? previewFor(state, held, pointerCell) : null;

  function flash(text: string) {
    setToast({ id: Date.now(), text });
  }

  function apply(result: Result) {
    if (result.ok) setState(result.state);
    else flash(result.reason);
    return result.ok;
  }

  function commit(h: Held, cell: Cell): boolean {
    const start = clampStart(cell.hour - h.grab, h.length);
    return apply(
      h.kind === 'card' ? placeCard(state, h.cardId, cell.day, start) : moveBlock(state, h.blockId, cell.day, start),
    );
  }

  function clearHeld() {
    setSelected(null);
    setDragging(null);
    setPointerCell(null);
  }

  function advance() {
    if (isTermOver(state)) return;
    clearHeld();
    const next = advanceDay(state);
    setState(next);
    setBanner({
      id: Date.now(),
      title: WEEKDAY_FULL[next.today % DAYS_PER_WEEK],
      sub: `Week ${Math.floor(next.today / DAYS_PER_WEEK) + 1} · Day ${next.today + 1}`,
    });
  }

  // Esc drops what you're holding, Delete removes a selected block, Enter ends the day.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') clearHeld();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected?.kind === 'block') {
        apply(removeBlock(state, selected.blockId));
        clearHeld();
      }
      if (e.key === 'Enter' && !held && !(e.target instanceof HTMLButtonElement)) advance();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as Held;
    const grid = gridRef.current;
    const size = grid
      ? { w: (grid.clientWidth - LABEL_W) / horizonDays(state).length, h: (grid.clientHeight - HEADER_H) / HOURS_PER_DAY }
      : cellSize;
    setCellSize(size);
    // Remember which hour of the card the pointer holds, so the ghost, the
    // preview and the drop all agree (and blocks don't jump when grabbed mid-way).
    let grab = 0;
    const initial = e.active.rect.current.initial;
    if (initial && e.activatorEvent instanceof PointerEvent) {
      const hourH = data.kind === 'block' ? initial.height / data.length : size.h;
      grab = Math.max(0, Math.min(data.length - 1, Math.floor((e.activatorEvent.clientY - initial.top) / hourH)));
    }
    setSelected(null);
    setDragging({ ...data, grab });
  }

  function onDragOver(e: DragOverEvent) {
    setPointerCell((e.over?.data.current as Cell | undefined) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const cell = e.over?.data.current as Cell | undefined;
    if (dragging && cell) commit(dragging, cell);
    clearHeld();
  }

  function selectCard(def: CardDef) {
    if (selected?.kind === 'card' && selected.cardId === def.id) return clearHeld();
    setSelected({ kind: 'card', cardId: def.id, length: def.blocks, grab: 0 });
  }

  function selectBlock(block: Block) {
    setSelected({ kind: 'block', blockId: block.id, length: block.length, grab: 0 });
  }

  function onCellClick(cell: Cell) {
    if (!selected) return;
    // Cards stay in hand so you can stamp several; moved blocks drop.
    if (!commit(selected, cell)) return;
    if (selected.kind === 'block') clearHeld();
    else setPointerCell(null); // hide the preview until the pointer moves on
  }

  function restart() {
    if (!confirm('Abandon this run and start a new term?')) return;
    clearHeld();
    setState(newRun(randomSeed()));
  }

  // Checkpoint numbers: how dense is the horizon, how fragmented.
  const days = horizonDays(state);
  const fixedCells = days.reduce(
    (n, d) => n + occupancy(state.blocks, d).filter((b) => b?.source === 'fixed').length,
    0,
  );
  const gapCount = days.reduce((n, d) => n + gapsForDay(state.blocks, d).length, 0);
  const termOver = isTermOver(state);

  const hint = selected ? (
    <>
      Holding <b className="text-yellow-200">{cardDef(heldCardId(state, selected)).name}</b> — click a slot to place it ·
      Esc to cancel{selected.kind === 'block' ? ' · Delete to remove' : ''}
    </>
  ) : (
    'Drag a card onto the board, or click a card then click a slot · Enter ends the day'
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={clearHeld}
    >
      <div className="flex h-screen min-h-[560px] flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="text-2xl font-black tracking-[0.2em] text-yellow-300">TERM</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black">{WEEKDAY_FULL[state.today % DAYS_PER_WEEK]}</span>
              <span className="text-xs font-bold text-white/45">
                Week {Math.floor(state.today / DAYS_PER_WEEK) + 1} · Day {state.today + 1}/{TERM_DAYS}
              </span>
            </div>
            <TermProgress today={state.today} />
          </div>

          <div className="ml-auto flex items-center gap-3 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/40">
            <span title="Fixed events in the visible horizon">
              fixed {fixedCells}/{days.length * HOURS_PER_DAY} ({Math.round((fixedCells / (days.length * HOURS_PER_DAY)) * 100)}%)
            </span>
            <span>{gapCount} gaps</span>
            <label className="flex cursor-pointer items-center gap-1">
              <input type="checkbox" checked={showGaps} onChange={(e) => setShowGaps(e.target.checked)} /> gaps
            </label>
            <span>seed {state.seed}</span>
            <button className="hover:text-white" onClick={restart} title="New run">
              ↻ new run
            </button>
          </div>

          <button
            className="press-3d rounded-xl bg-yellow-300 px-5 py-2 font-black text-[#1d1a2b] [--edge:#ca8a04] hover:bg-yellow-200 disabled:pointer-events-none disabled:opacity-40"
            onClick={advance}
            disabled={termOver}
          >
            {termOver ? 'Term over' : 'End day ▶'}
          </button>
        </header>

        <main className="relative min-h-0 flex-1 px-3 pb-3" onMouseLeave={() => !dragging && setPointerCell(null)}>
          <Calendar
            state={state}
            held={held}
            clickMode={selected !== null}
            preview={preview}
            showGaps={showGaps}
            gridRef={gridRef}
            onCellEnter={(cell) => {
              if (selected && (pointerCell?.day !== cell.day || pointerCell?.hour !== cell.hour)) setPointerCell(cell);
            }}
            onCellClick={onCellClick}
            onBlockClick={selectBlock}
            onBlockRemove={(b) => apply(removeBlock(state, b.id))}
          />

          {banner && (
            <div
              key={banner.id}
              className="pointer-events-none absolute inset-0 z-50 flex animate-banner flex-col items-center justify-center"
              onAnimationEnd={() => setBanner(null)}
            >
              <div className="rounded-2xl bg-[#16131f]/85 px-10 py-5 text-center shadow-2xl ring-1 ring-yellow-300/30">
                <div className="text-4xl font-black tracking-wide text-yellow-300">{banner.title}</div>
                <div className="mt-1 text-sm font-bold text-white/60">{banner.sub}</div>
              </div>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-50 flex justify-center">
              <div key={toast.id} className="animate-shake rounded-full bg-red-500 px-4 py-1.5 text-sm font-extrabold text-white shadow-lg">
                {toast.text}
              </div>
            </div>
          )}
        </main>

        <CardDock selectedCardId={selected?.kind === 'card' ? selected.cardId : null} hint={hint} onSelect={selectCard} />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div style={{ width: cellSize.w - 4, height: dragging.length * cellSize.h - 4 }} className="rotate-2 opacity-95">
            <BlockFace def={cardDef(heldCardId(state, dragging))} length={dragging.length} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
