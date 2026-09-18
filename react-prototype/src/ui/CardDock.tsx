import type { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CardDef } from '../game/types';
import { CARD_LIST } from '../game/cards';
import { CARD_ICON, CATEGORY_TILE } from './theme';
import type { Held } from './interaction';

interface Props {
  selectedCardId: string | null;
  hint: ReactNode;
  onSelect: (def: CardDef) => void;
}

function HandCard({ def, selected, onSelect }: { def: CardDef; selected: boolean; onSelect: () => void }) {
  const held: Held = { kind: 'card', cardId: def.id, length: def.blocks, grab: 0 };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card:${def.id}`, data: held });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`flex h-[104px] w-[84px] shrink-0 cursor-grab flex-col items-center justify-between rounded-xl border-b-4 px-1.5 py-2 shadow-lg shadow-black/50 transition-transform duration-150 hover:-translate-y-2 ${
        CATEGORY_TILE[def.category]
      } ${selected ? '-translate-y-2 ring-4 ring-yellow-300' : ''} ${isDragging ? 'opacity-30' : ''}`}
    >
      <span className="text-3xl leading-none">{CARD_ICON[def.id]}</span>
      <span className="text-center text-xs leading-tight font-extrabold">{def.name}</span>
      <span className="flex gap-0.5" title={`${def.blocks} hours`}>
        {Array.from({ length: def.blocks }, (_, i) => (
          <span key={i} className="h-1.5 w-2.5 rounded-sm bg-current opacity-60" />
        ))}
      </span>
    </button>
  );
}

function Group({ title, note, cards, selectedCardId, onSelect }: {
  title: string;
  note?: string;
  cards: CardDef[];
  selectedCardId: string | null;
  onSelect: (def: CardDef) => void;
}) {
  return (
    <section className="flex shrink-0 flex-col gap-1">
      <h2 className="text-[11px] font-black tracking-widest text-white/50 uppercase">
        {title} {note && <span className="font-semibold tracking-normal normal-case text-white/30">· {note}</span>}
      </h2>
      <div className="flex gap-2">
        {cards.map((c) => (
          <HandCard key={c.id} def={c} selected={selectedCardId === c.id} onSelect={() => onSelect(c)} />
        ))}
      </div>
    </section>
  );
}

/** The hand. Activities have no counts — they're unlimited. */
export function CardDock({ selectedCardId, hint, onSelect }: Props) {
  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#1d1a2b]">
      <div className="px-4 pt-1.5 text-xs text-white/50">{hint}</div>
      <div className="flex gap-6 overflow-x-auto px-4 pt-3 pb-3">
        <Group
          title="Activities"
          cards={CARD_LIST.filter((c) => c.supply === 'activity')}
          selectedCardId={selectedCardId}
          onSelect={onSelect}
        />
        <div className="w-px shrink-0 bg-white/10" />
        <Group
          title="Offers"
          note="unlimited for testing until M3"
          cards={CARD_LIST.filter((c) => c.supply === 'offer')}
          selectedCardId={selectedCardId}
          onSelect={onSelect}
        />
      </div>
    </footer>
  );
}
