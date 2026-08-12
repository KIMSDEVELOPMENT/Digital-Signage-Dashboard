/**
 * shared/utils/slugify.js
 *
 * Converts a display name to a URL-safe slug.
 * Used for branch and location name → slug conversion.
 *
 * Examples:
 *   slugify('A Block')   → 'a-block'
 *   slugify('KSS / KCC') → 'kss-kcc'
 */
export const slugify = (value) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Resolves a location slug/name case-insensitively against the DB.
 * Strips non-alphanumeric characters for a loose match.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} branch
 * @param {string} locParam
 * @returns {Promise<string|null>}
 */
export const resolveLocationName = async (pool, branch, locParam) => {
  if (!locParam) return null;
  const [rows] = await pool.query(
    `SELECT l.name AS location
     FROM locations l
     JOIN branches b ON l.branch_id = b.id
     WHERE LOWER(b.name) = LOWER(?)`,
    [branch]
  );
  const normParam = locParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const row of rows) {
    const normDb = row.location.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normDb === normParam) return row.location;
  }
  return locParam; // fallback: return as-is
};
