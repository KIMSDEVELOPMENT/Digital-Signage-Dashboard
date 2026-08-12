/**
 * modules/doctor/bulk-upload/bulkUpload.controller.js
 *
 * HTTP layer for bulk doctor upload operations.
 * Re-exports from original doctorController for zero-risk migration.
 *
 * Future: When splitting, move the Excel parsing and row validation logic
 * into bulkUpload.service.js, and keep only HTTP orchestration here.
 */
export { downloadDoctorTemplate, uploadBulkDoctors } from '../../../controllers/doctorController.js';
