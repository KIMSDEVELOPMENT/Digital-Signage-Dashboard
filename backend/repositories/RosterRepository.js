import { getPool } from '../config/db.js';
import { Roster } from '../models/Roster.js';

/**
 * RosterRepository - encapsulates all SQL queries for the roster table.
 */
export class RosterRepository {
  async findTodayRoster({ branch, location = null }) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT r.id AS roster_id, r.date, r.timing, 
             d.id AS doctor_id, d.employee_id, d.name AS doctor_name, 
             d.designation, d.photo_url, b.name AS branch, l.name AS location,
             dept.name AS department_name
      FROM roster r
      JOIN doctors d ON r.doctor_id = d.id
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE r.date = ? AND b.name = ?
    `;
    const params = [today, branch];

    if (location) {
      query += ' AND l.name = ?';
      params.push(location);
    }

    query += ' ORDER BY d.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Roster(r));
  }

  async importRoster(entries, today) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const uniqueBranches = [...new Set(entries.map((e) => e.branch_id))];
      for (const branchId of uniqueBranches) {
        await connection.query(
          `DELETE r FROM roster r JOIN doctors d ON r.doctor_id = d.id
           WHERE r.date = ? AND d.branch_id = ?`,
          [today, branchId]
        );
      }

      if (entries.length > 0) {
        const values = entries.map((e) => [today, e.doctor_id, e.timing]);
        await connection.query('INSERT INTO roster (date, doctor_id, timing) VALUES ?', [values]);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

export default new RosterRepository();
