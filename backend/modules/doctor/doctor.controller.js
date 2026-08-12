/**
 * modules/doctor/doctor.controller.js
 *
 * CRUD-only operations for doctors (no bulk upload — that lives in bulk-upload/).
 * Re-exports from the original controller for zero-risk migration.
 */
export { getDoctors, createDoctor, updateDoctor, deleteDoctor, getDoctorsForShuffling } from '../../controllers/doctorController.js';
