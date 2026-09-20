import type { Category, Trait } from '../game/types';

/** Colour encodes category only. Locks are an icon, never a colour. */
export const CATEGORY_TILE: Record<Category, string> = {
  study: 'bg-sky-400 border-sky-700 text-sky-950',
  social: 'bg-pink-400 border-pink-700 text-pink-950',
  work: 'bg-amber-400 border-amber-700 text-amber-950',
  health: 'bg-emerald-400 border-emerald-700 text-emerald-950',
  life: 'bg-violet-400 border-violet-700 text-violet-950',
  fixed: 'bg-slate-500 border-slate-700 text-slate-50',
  debt: 'bg-red-500 border-red-800 text-red-50',
  sleep: 'bg-indigo-400/70 border-indigo-700 text-indigo-950',
};

/** Presentation only — Godot will use its own art. */
export const CARD_ICON: Record<string, string> = {
  lecture: '🎓',
  tutorial: '✏️',
  lab: '🧪',
  exam: '📝',
  appointment: '🩺',
  club_meeting: '🎲',
  family_visit: '🏠',
  study_light: '📖',
  study_focused: '📚',
  cram: '🔥',
  gym: '🏋️',
  rest: '🛋️',
  chores: '🧺',
  shift: '💼',
  short_shift: '🧾',
  coffee: '☕',
  dinner: '🍝',
  night_out: '🪩',
  catch_up: '⏳',
  sleep_in: '😴',
};

export const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TRAIT_ICON: Record<Trait, string> = {
  intelligence: '🧠',
  physicality: '💪',
  popularity: '⭐',
};

export const TRAIT_SHORT: Record<Trait, string> = {
  intelligence: 'INT',
  physicality: 'PHY',
  popularity: 'POP',
};
