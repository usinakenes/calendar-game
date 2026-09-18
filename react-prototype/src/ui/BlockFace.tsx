import type { CardDef } from '../game/types';
import { CARD_ICON, CATEGORY_TILE } from './theme';

const HATCH =
  'bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.13),rgba(0,0,0,0.13)_5px,transparent_5px,transparent_10px)]';

interface Props {
  def: CardDef;
  length: number;
  label?: string;
  locked?: boolean;
  /** Can't be moved (fixed, debt, or already today): diagonal hatch. */
  immovable?: boolean;
  onRemove?: () => void;
}

/** A card as a tile on the board. Shows its own duration: 3h ≠ 3×1h. */
export function BlockFace({ def, length, label, locked, immovable, onRemove }: Props) {
  return (
    <div
      className={`group relative h-full w-full overflow-hidden rounded-md border-b-4 px-1.5 py-0.5 text-[11px] leading-tight shadow-md shadow-black/40 ${CATEGORY_TILE[def.category]} ${immovable ? HATCH : ''}`}
    >
      <div className="flex items-center gap-1 font-extrabold whitespace-nowrap">
        <span>{CARD_ICON[def.id] ?? '▪️'}</span>
        <span className="truncate">{def.name}</span>
        <span className="ml-auto shrink-0 opacity-70">
          {locked && '🔒 '}
          {length}h
        </span>
      </div>
      {label && <div className="truncate font-semibold opacity-80">{label}</div>}
      {onRemove && (
        <button
          className="absolute right-0.5 bottom-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-black/30 text-[10px] leading-none text-white group-hover:flex hover:bg-black/60"
          title="Remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
