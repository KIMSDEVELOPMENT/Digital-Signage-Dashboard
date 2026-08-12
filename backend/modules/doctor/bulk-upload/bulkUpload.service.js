/**
 * modules/doctor/bulk-upload/bulkUpload.service.js
 *
 * Business logic for bulk doctor Excel upload.
 * This is a PLACEHOLDER — the actual Excel parsing, row processing,
 * and assignment merging logic currently lives in doctorController.js
 * inside the uploadBulkDoctors() function (lines 364–607).
 *
 * HOW TO COMPLETE THIS MIGRATION (Phase 2):
 * 1. Move the Excel processing logic from doctorController.js here.
 * 2. Update bulkUpload.controller.js to call this service.
 * 3. Delete the uploadBulkDoctors function from doctorController.js.
 *
 * Responsibilities of this service (when fully migrated):
 *   - Validate Excel file structure (headers)
 *   - Parse rows into doctor objects
 *   - Resolve branch/location/department IDs from cache
 *   - Apply "single-block-per-branch" business rule
 *   - Merge with existing doctor assignments
 *   - Upsert doctor_sittings for display_days
 */

// Placeholder — implementation to be extracted from doctorController.js
export const processBulkUpload = async () => {
  throw new Error('bulkUpload.service.js is a placeholder — see JSDoc for migration instructions.');
};
