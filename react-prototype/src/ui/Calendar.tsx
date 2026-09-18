import { Fragment, type Ref } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Block, GameState } from '../game/types';
import { FIRST_HOUR, HORIZON_DAYS, HOURS_PER_DAY, WEEKDAY_NAMES } from '../game/constants';
import { cardDef } from '../game/cards';
import { gapsForDay } from '../game/grid';
import { canMove, horizonDays, isPlannableDay } from '../game/rules';
import { BlockFace } from './BlockFace';
import type { Cell, Held } from './interaction';

export interface Preview {
  day: number;
  start: number;
  length: number;
  name: string;
  error: string | null;
}

interface Props {
  state: GameState;
  held: Held | null;
  /** Click-to-place mode: blocks let clicks through to the cells beneath. */
  clickMode: boolean;
  preview: Preview | null;
  showGaps: boolean;
  gridRef: Ref<HTMLDivElement>;
  onCellEnter: (cell: Cell) => void;
  onCellClick: (cell: Cell) => void;
  onBlockClick: (block: Block) => void;
  onBlockRemove: (block: Block) => void;
}

export const HEADER_H = 40;
export const LABEL_W = 48;
const col = (i: number) => i + 2;
const row = (hour: number) => hour + 2;

function DropCell(props: Cell & { column: number; onEnter: () => void; onClick: () => void }) {
  const data: Cell = { day: props.day, hour: props.hour };
  const { setNodeRef } = useDroppable({ id: `cell:${props.day}:${props.hour}`, data });
  return (
    <div
      ref={setNodeRef}
      onPointerMove={props.onEnter}
      onClick={props.onClick}
      className="border-b border-white/5 hover:bg-white/5"
      style={{ gridColumn: props.column, gridRow: row(props.hour) }}
    />
  );
}

function GridBlock(props: {
  block: Block;
  column: number;
  movable: boolean;
  dimmed: boolean;
  clickMode: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  const { block, movable } = props;
  const held: Held = { kind: 'block', blockId: block.id, length: block.length, grab: 0 };
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `block:${block.id}`, data: held, disabled: !movable });
  return (
    <div
      ref={setNodeRef}
      {...(movable ? { ...attributes, ...listeners } : {})}
      onClick={movable ? props.onClick : undefined}
      className={`z-20 animate-pop p-0.5 ${movable ? 'cursor-grab' : ''} ${props.dimmed ? 'opacity-25' : ''} ${
        props.clickMode ? 'pointer-events-none' : ''
      }`}
      style={{ gridColumn: props.column, gridRow: `${row(block.start)} / span ${block.length}` }}
    >
      <BlockFace
        def={cardDef(block.cardId)}
        length={block.length}
        label={block.label}
        locked={block.source === 'fixed' || block.source === 'debt'}
        immovable={!movable}
        onRemove={movable ? props.onRemove : undefined}
      />
    </div>
  );
}

export function Calendar(props: Props) {
  const { state, held, clickMode, preview, showGaps } = props;
  const days = horizonDays(state);
  const heldBlockId = held?.kind === 'block' ? held.blockId : null;
  const edgeDay = state.today + HORIZON_DAYS - 1;

  return (
    <div
      ref={props.gridRef}
      className="grid h-full w-full overflow-hidden rounded-xl bg-[#241f36] shadow-2xl ring-1 ring-white/10 select-none"
      style={{
        gridTemplateColumns: `${LABEL_W}px repeat(${days.length}, minmax(0, 1fr))`,
        gridTemplateRows: `${HEADER_H}px repeat(${HOURS_PER_DAY}, minmax(24px, 1fr))`,
      }}
    >
      {Array.from({ length: HOURS_PER_DAY }, (_, h) => (
        <div
          key={`h${h}`}
          className="border-b border-white/5 pt-0.5 pr-1.5 text-right text-[10px] font-bold text-white/35"
          style={{ gridColumn: 1, gridRow: row(h) }}
        >
          {String(FIRST_HOUR + h).padStart(2, '0')}:00
        </div>
      ))}

      {days.map((day, i) => {
        const isToday = day === state.today;
        const weekStart = day % 7 === 0;
        const weekend = day % 7 >= 5;
        const c = col(i);
        // The day that just entered the horizon slides in.
        const entering = day === edgeDay ? 'animate-slide-in' : '';
        return (
          <Fragment key={day}>
          {[
          <div
            key={`bg${day}`}
            className={`${entering} border-l ${weekStart ? 'border-l-2 border-l-yellow-300/40' : 'border-l-white/5'} ${
              isToday
                ? 'bg-black/20 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_6px,transparent_6px,transparent_12px)]'
                : weekend
                  ? 'bg-white/[0.02]'
                  : ''
            }`}
            style={{ gridColumn: c, gridRow: `1 / span ${HOURS_PER_DAY + 1}` }}
          />,
          <div
            key={`hd${day}`}
            className={`${entering} flex items-center gap-1.5 border-b border-white/10 px-2 text-sm`}
            style={{ gridColumn: c, gridRow: 1 }}
          >
            <span className={`font-black ${isToday ? 'text-white/40' : weekend ? 'text-yellow-200' : 'text-white'}`}>
              {WEEKDAY_NAMES[day % 7]}
            </span>
            <span className="text-xs font-bold text-white/35">{day + 1}</span>
            {isToday && (
              <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white/50">
                🔒 TODAY
              </span>
            )}
            {!isToday && weekStart && (
              <span className="ml-auto text-[10px] font-black tracking-wider text-yellow-300/60">WEEK {day / 7 + 1}</span>
            )}
          </div>,

          ...(isPlannableDay(state, day)
            ? Array.from({ length: HOURS_PER_DAY }, (_, h) => (
                <DropCell
                  key={`c${day}:${h}`}
                  day={day}
                  hour={h}
                  column={c}
                  onEnter={() => props.onCellEnter({ day, hour: h })}
                  onClick={() => props.onCellClick({ day, hour: h })}
                />
              ))
            : []),

          // Gaps: explicit negative space. While holding a card, the ones it fits light up.
          ...(showGaps
            ? gapsForDay(state.blocks, day).map((g) => {
                const fits = held && !isToday ? g.length >= held.length : null;
                return (
                  <div
                    key={`g${day}:${g.start}:${g.length}`}
                    className={`pointer-events-none z-10 m-1 rounded-md border border-dashed px-1.5 pt-0.5 text-[10px] font-bold transition-colors ${
                      fits === null
                        ? 'border-white/15 text-white/30'
                        : fits
                          ? 'border-emerald-300/80 bg-emerald-300/10 text-emerald-200'
                          : 'border-white/5 text-white/10'
                    }`}
                    style={{ gridColumn: c, gridRow: `${row(g.start)} / span ${g.length}` }}
                  >
                    {g.length}h free
                  </div>
                );
              })
            : []),

          ...state.blocks
            .filter((b) => b.day === day)
            .map((b) => (
              <GridBlock
                key={b.id}
                block={b}
                column={c}
                movable={canMove(state, b)}
                dimmed={b.id === heldBlockId}
                clickMode={clickMode}
                onClick={() => props.onBlockClick(b)}
                onRemove={() => props.onBlockRemove(b)}
              />
            )),
          ]}
          </Fragment>
        );
      })}

      {preview && days.includes(preview.day) && (
        <div
          className={`pointer-events-none z-30 m-0.5 rounded-md border-2 px-1.5 text-[11px] font-extrabold ${
            preview.error
              ? 'border-red-400 bg-red-500/30 text-red-100'
              : 'border-emerald-300 bg-emerald-400/30 text-emerald-50'
          }`}
          style={{
            gridColumn: col(days.indexOf(preview.day)),
            gridRow: `${row(preview.start)} / span ${preview.length}`,
          }}
        >
          {preview.name} · {preview.length}h
          {preview.error && <div className="font-semibold">{preview.error}</div>}
        </div>
      )}
    </div>
  );
}
