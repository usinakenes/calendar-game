export type Category = 'study' | 'social' | 'work' | 'health' | 'life' | 'fixed' | 'debt';

/** Who supplies the card: the player (unlimited), an offer, the system. */
export type Supply = 'activity' | 'offer' | 'fixed' | 'debt';

/** fluid: drag freely until the day arrives. onPlacement: locks when placed (M3). fixed: never moves. */
export type LockRule = 'fluid' | 'onPlacement' | 'fixed';

export interface CardDef {
  id: string;
  name: string;
  category: Category;
  /** Fixed length in hour blocks (1–5). */
  blocks: number;
  supply: Supply;
  lock: LockRule;
}

export type BlockSource = 'activity' | 'offer' | 'fixed' | 'debt' | 'emergency';

/** The one primitive on the grid. */
export interface Block {
  id: string;
  cardId: string;
  /** Absolute day index, 0 = Monday of week 1. */
  day: number;
  /** Hour index 0–13. */
  start: number;
  length: number;
  source: BlockSource;
  /** Display flavour, e.g. the course name on a lecture. */
  label?: string;
}

export interface GameState {
  version: 1;
  seed: number;
  /** Absolute day index of today. Today is locked. */
  today: number;
  blocks: Block[];
  nextId: number;
}
