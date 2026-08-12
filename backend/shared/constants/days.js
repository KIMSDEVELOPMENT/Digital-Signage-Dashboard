/**
 * shared/constants/days.js
 *
 * Canonical list of weekday abbreviations used across the codebase
 * (roster upload, doctor settings, display days).
 * Previously copy-pasted in rosterController.js and doctorController.js.
 */
export const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * Parses a raw days string (e.g. "MON, TUE, WED" or "DAILY") into an array
 * of canonical day abbreviations.
 *
 * @param {string} rawDays
 * @returns {string[]}
 */
export const parseDaysString = (rawDays) => {
  if (!rawDays) return [];
  const tokens = rawDays.toUpperCase().split(/[\s,]+/);
  const set = new Set();
  for (const token of tokens) {
    const clean = token.replace(/[^A-Z]/g, '');
    if (['DAILY', 'ALL', 'ALLDAYS'].includes(clean)) {
      VALID_DAYS.forEach(d => set.add(d));
    } else if (VALID_DAYS.includes(clean)) {
      set.add(clean);
    } else {
      const match = VALID_DAYS.find(d => clean.startsWith(d));
      if (match) set.add(match);
    }
  }
  return VALID_DAYS.filter(d => set.has(d));
};
