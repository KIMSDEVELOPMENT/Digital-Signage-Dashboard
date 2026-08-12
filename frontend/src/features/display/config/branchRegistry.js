import { kimsConfig } from './branches/kims.config.js';
import { ssccConfig } from './branches/sscc.config.js';
import { kidsConfig } from './branches/kids.config.js';

/**
 * Branch Plugin Registry
 *
 * Maps URL branch slugs to their branch config objects.
 *
 * HOW TO ADD A NEW BRANCH:
 * 1. Create `src/features/display/config/branches/newbranch.config.js`
 * 2. Add one entry to REGISTRY below.
 * 3. Done — no changes needed in DisplayScreen.jsx or anywhere else.
 *
 * Each config must implement:
 *   - id:          string
 *   - displayName: string
 *   - theme:       { accentColor, bgPrimary, textPrimary, logo, footerNumbers[] }
 *   - buildPages:  async (branch, location) => { pages, playlist }
 */
const REGISTRY = {
  // SSCC — Super Speciality Cancer Centre (dual-location KSS/KCC logic)
  sscc: ssccConfig,

  // KIMS — main hospital (default)
  kims: kimsConfig,
  pbmh: kimsConfig, // PBMH uses the same simple logic as KIMS

  // KIDS / Dental — same playlist logic as KIMS, different logo
  kids: kidsConfig,
  dental: kidsConfig, // alias slug

  // ── Add future branches here ──────────────────────────────────────────────
  // kalinga: kalingaConfig,
  // ─────────────────────────────────────────────────────────────────────────
};

/**
 * Returns the branch config for a given slug.
 * Falls back to kimsConfig if the slug is not registered.
 */
export const getBranchConfig = (branchSlug) => {
  const key = branchSlug?.toLowerCase?.() ?? '';
  return REGISTRY[key] ?? kimsConfig;
};

export default REGISTRY;
