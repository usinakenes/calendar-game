import { Fragment, type Ref } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Block, GameState } from '../game/types';
import { TRAITS } from '../game/types';
import { FIRST_HOUR, HORIZON_DAYS, HOURS_PER_DAY, SLEEP_MAX, SLEEP_MIN, WEEKDAY_NAMES } from '../game/constants';
import { cardDef } from '../game/cards';
import { gapsForDay } from '../game/grid';
import { canMove, canSetSleep, horizonDays, isPlannableDay, isSleepBlock } from '../game/rules';
import type { DayResult } from '../game/resolve';
import { BlockFace } from './BlockFace';
import { TRAIT_ICON } from './theme';
import type { Cell, Held } from './interaction';

export interface Preview {
  day: number;
  start: number;
  length: number;
  name: string;
  error: string | null;
}

export interface Playback {
  result: DayResult;
  /** Last hour that has resolved; -1 before the first. */
  hour: number;
}

interface Props {
  state: GameState;
  held: Held | null;
  /** Click-to-place mode: blocks let clicks through to the cells beneath. */
  clickMode: boolean;
  preview: Preview | null;
  showGaps: boolean;
  /** Simulated outcome of each visible day with the current plan. */
  projections: Record<number, DayResult>;
  playback: Playback | null;
  gridRef: Ref<HTMLDivElement>;
  onCellEnter: (cell: Cell) => void;
  onCellClick: (cell: Cell) => void;
  onBlockClick: (block: Block) => void;
  onBlockRemove: (block: Block) => void;
  onSleep: (day: number, hours: number) => void;
}

export const HEADER_H = 54;
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
  const sleep = isSleepBlock(block);
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
        immovable={!movable && !sleep}
        onRemove={movable ? props.onRemove : undefined}
      />
    </div>
  );
}

function energyTone(e: number): string {
  if (e <= 0) return 'text-red-400';
  if (e < 20) return 'text-amber-300';
  return 'text-white/60';
}

function SleepControl({ hours, editable, onChange }: { hours: number; editable: boolean; onChange: (h: number) => void }) {
  const btn =
    'flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[11px] leading-none font-black text-white/70 hover:bg-white/25 disabled:opacity-20 disabled:hover:bg-white/10';
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-200/80" title="Sleep the night before">
      🌙
      {editable && (
        <button className={btn} disabled={hours <= SLEEP_MIN} onClick={() => onChange(hours - 1)}>
          −
        </button>
      )}
      <span className="w-5 text-center">{hours}h</span>
      {editable && (
        <button className={btn} disabled={hours >= SLEEP_MAX} onClick={() => onChange(hours + 1)}>
          +
        </button>
      )}
    </span>
  );
}

function formatGains(g: Record<string, number>, money: number): string {
  const parts = TRAITS.filter((t) => Math.abs(g[t]) >= 0.005).map((t) => `+${g[t].toFixed(2)}${TRAIT_ICON[t]}`);
  if (money) parts.push(`${money > 0 ? '+' : '−'}${Math.abs(money)}💰`);
  return parts.join(' ');
}

export function Calendar(props: Props) {
  const { state, held, clickMode, preview, showGaps, projections, playback } = props;
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
        const proj = projections[day];
        const emptyAt = proj?.events.find((e) => e.kind === 'outOfEnergy')?.hour;
        // The day that just entered the horizon slides in.
        const entering = day === edgeDay ? 'animate-slide-in' : '';
        const playing = isToday && playback !== null;

        return (
          <Fragment key={day}>
            <div
              className={`${entering} border-l ${weekStart ? 'border-l-2 border-l-yellow-300/40' : 'border-l-white/5'} ${
                isToday
                  ? 'bg-black/20 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_6px,transparent_6px,transparent_12px)]'
                  : weekend
                    ? 'bg-white/[0.02]'
                    : ''
              }`}
              style={{ gridColumn: c, gridRow: `1 / span ${HOURS_PER_DAY + 1}` }}
            />
            <div
              className={`${entering} flex flex-col justify-center gap-0.5 border-b border-white/10 px-2`}
              style={{ gridColumn: c, gridRow: 1 }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <span className={`font-black ${isToday ? 'text-white/50' : weekend ? 'text-yellow-200' : 'text-white'}`}>
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
              </div>
              <div className="flex items-center justify-between gap-1">
                <SleepControl
                  hours={state.sleep[day]}
                  editable={canSetSleep(state, day)}
                  onChange={(h) => props.onSleep(day, h)}
                />
                {proj && (
                  <span
                    className={`text-[11px] font-extrabold ${energyTone(proj.endStats.energy)}`}
                    title="Energy at the start → end of this day, with the current plan"
                  >
                    ⚡{proj.startEnergy}→{proj.endStats.energy}
                  </span>
                )}
              </div>
            </div>

            {isPlannableDay(state, day) &&
              Array.from({ length: HOURS_PER_DAY }, (_, h) => (
                <DropCell
                  key={`c${h}`}
                  day={day}
                  hour={h}
                  column={c}
                  onEnter={() => props.onCellEnter({ day, hour: h })}
                  onClick={() => props.onCellClick({ day, hour: h })}
                />
              ))}

            {/* Gaps: explicit negative space. While holding a card, the ones it fits light up. */}
            {showGaps &&
              gapsForDay(state.blocks, day).map((g) => {
                const fits = held && !isToday ? g.length >= held.length : null;
                return (
                  <div
                    key={`g${g.start}:${g.length}`}
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
              })}

            {state.blocks
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
              ))}

            {/* Where the tank runs dry with the current plan: everything after produces almost nothing. */}
            {emptyAt !== undefined && emptyAt < HOURS_PER_DAY - 1 && !playing && (
              <div
                className="pointer-events-none z-[25] border-t-2 border-dashed border-red-400/80 bg-red-500/15"
                style={{ gridColumn: c, gridRow: `${row(emptyAt + 1)} / span ${HOURS_PER_DAY - emptyAt - 1}` }}
              >
                <span className="ml-1 rounded-b bg-red-500 px-1 text-[10px] font-black text-white">⚡ EMPTY</span>
              </div>
            )}

            {/* Resolution: the now-line sweeps down today's column. */}
            {playing && (
              <div className="pointer-events-none relative z-40" style={{ gridColumn: c, gridRow: `2 / span ${HOURS_PER_DAY}` }}>
                <div
                  className="absolute inset-x-0 top-0 bg-yellow-300/10 transition-[height] duration-75 ease-linear"
                  style={{ height: `${((playback.hour + 1) / HOURS_PER_DAY) * 100}%` }}
                />
                <div
                  className="absolute inset-x-0 h-0.5 bg-yellow-300 shadow-[0_0_12px_2px_rgba(253,224,71,0.7)] transition-[top] duration-75 ease-linear"
                  style={{ top: `${((playback.hour + 1) / HOURS_PER_DAY) * 100}%` }}
                />
              </div>
            )}
            {playing &&
              playback.result.events
                .filter((e) => e.hour <= playback.hour)
                .map((e) =>
                  e.kind === 'blockEnd' ? (
                    formatGains(e.gains, e.money) && (
                      <div
                        key={`ev${e.blockId}`}
                        className="pointer-events-none z-50 flex items-end justify-center"
                        style={{ gridColumn: c, gridRow: row(e.hour) }}
                      >
                        <span className="animate-float-up rounded-full bg-[#16131f]/90 px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-yellow-200 shadow-lg">
                          {formatGains(e.gains, e.money)}
                        </span>
                      </div>
                    )
                  ) : (
                    <div
                      key={`out${e.hour}`}
                      className="pointer-events-none z-50 flex items-end justify-center"
                      style={{ gridColumn: c, gridRow: row(e.hour) }}
                    >
                      <span className="animate-pop rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-white shadow-lg">
                        ⚡ Out of energy
                      </span>
                    </div>
                  ),
                )}
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
