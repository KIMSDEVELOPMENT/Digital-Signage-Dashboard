import { getPool } from '../config/db.js';

export class SittingRepository {
  async searchDoctors(query) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT d.id, d.employee_id, d.name, d.designation, d.photo_url, d.status, s.branch_id, s.location_id, s.display_days
       FROM doctors d
       LEFT JOIN doctor_sittings s ON d.employee_id = s.employee_id
       WHERE (d.employee_id LIKE ? OR d.name LIKE ?) AND d.status = 1
       ORDER BY d.name ASC
       LIMIT 50`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  }

  async getSittingsByEmployeeId(employeeId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM doctor_sittings WHERE employee_id = ? ORDER BY branch_id ASC, location_id ASC`,
      [employeeId]
    );
    return rows;
  }

  async upsertSitting(employeeId, branchId, locationId, displayDays) {
    const pool = getPool();
    const displayDaysJson = JSON.stringify(displayDays);
    const [result] = await pool.query(
      `INSERT INTO doctor_sittings (employee_id, branch_id, location_id, display_days)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE display_days = VALUES(display_days)`,
      [employeeId, branchId, locationId, displayDaysJson]
    );
    return result;
  }
}

export default new SittingRepository();
