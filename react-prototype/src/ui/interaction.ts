/** What the player is currently holding, by drag or by click-to-select. */
export type Held =
  | { kind: 'card'; cardId: string; length: number; grab: number }
  | { kind: 'block'; blockId: string; length: number; grab: number };

export interface Cell {
  day: number;
  hour: number;
}
