export type Category = 'study' | 'social' | 'work' | 'health' | 'life' | 'fixed' | 'debt' | 'sleep';

/** Who supplies the card: the player (unlimited), an offer, the system. `sleep` is the sleep-in block. */
export type Supply = 'activity' | 'offer' | 'fixed' | 'debt' | 'sleep';

export type Trait = 'intelligence' | 'physicality' | 'popularity';
export const TRAITS: Trait[] = ['intelligence', 'physicality', 'popularity'];

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
  /** Energy cost per hour. Negative restores (rest). */
  energy: number;
  /** Trait gain per hour, before exhaustion (M2 replaces flat rates with curves). */
  yields?: Partial<Record<Trait, number>>;
  /** Money for the whole card, paid when it starts. Positive earns, negative costs. */
  money?: number;
  /** Physicality reduces its energy cost. */
  physical?: boolean;
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

export interface Stats {
  /** Current energy. Set each morning from last night's sleep. */
  energy: number;
  money: number;
  intelligence: number;
  physicality: number;
  popularity: number;
}

export interface GameState {
  version: 2;
  seed: number;
  /** Absolute day index of today. Today is locked. */
  today: number;
  blocks: Block[];
  nextId: number;
  stats: Stats;
  /** sleep[d] = hours slept the night before day d (4–10). Hours beyond 8 eat day d's morning. */
  sleep: number[];
}
