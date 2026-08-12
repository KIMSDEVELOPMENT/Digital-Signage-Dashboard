/**
 * modules/display/display.service.js
 *
 * Playlist-building business logic extracted from displayController.js.
 * Currently a PLACEHOLDER — the actual DB queries live in displayController.js.
 *
 * HOW TO COMPLETE THIS MIGRATION:
 * 1. Move the doctor grouping & playlist-assembly logic from displayController.js here.
 * 2. Create display.repository.js for raw DB queries (fetchPlaylist, fetchVideos).
 * 3. Keep only HTTP layer (req parsing, res.json) in display.controller.js.
 *
 * Responsibilities (when fully migrated):
 *   - Resolve branchSlug + locationSlug → branch_id + location_id
 *   - Fetch and assemble playlist steps with grouped doctors
 *   - Fetch videos for the branch/location
 *   - Return { branch, location, steps, videos }
 */

export const buildPlaylist = async () => {
  throw new Error('display.service.js is a placeholder — see JSDoc for migration instructions.');
};
