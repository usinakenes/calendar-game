/** Hour blocks per day, 08:00–22:00, indexed 0–13. */
export const HOURS_PER_DAY = 14;
export const FIRST_HOUR = 8;
/** Visible planning horizon: today + 6. */
export const HORIZON_DAYS = 7;
export const DAYS_PER_WEEK = 7;
export const TERM_WEEKS = 12;
export const TERM_DAYS = TERM_WEEKS * DAYS_PER_WEEK;

/** Target fixed-event density per week, in blocks (of 98). ~30–40%. */
export const FIXED_DENSITY_MIN = 30;
export const FIXED_DENSITY_MAX = 39;

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
