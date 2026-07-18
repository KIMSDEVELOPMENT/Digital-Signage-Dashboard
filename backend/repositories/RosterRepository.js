import { getPool } from '../config/db.js';
import { Roster } from '../models/Roster.js';

/**
 * RosterRepository - encapsulates all SQL queries for the roster table.
 */
export class RosterRepository {
  async findRosterByDate({ branch, location = null, date }) {
    const pool = getPool();

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
    const params = [date, branch];

    if (location) {
      query += ' AND l.name = ?';
      params.push(location);
    }

    query += ' ORDER BY d.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Roster(r));
  }

  async findTodayRoster({ branch, location = null }) {
    const today = new Date().toISOString().split('T')[0];
    return this.findRosterByDate({ branch, location, date: today });
  }

  async addManualEntry({ date, doctor_id, timing, branch_id, location_id }) {
    const pool = getPool();
    // Use INSERT IGNORE or ON DUPLICATE KEY UPDATE depending on schema unique keys
    // Assuming unique key is on date, doctor_id, branch_id, location_id, timing
    const [res] = await pool.query(
      'INSERT INTO roster (date, doctor_id, timing, branch_id, location_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE timing = ?',
      [date, doctor_id, timing, branch_id, location_id, timing]
    );
    return res.insertId;
  }

  async deleteManualEntry(id) {
    const pool = getPool();
    await pool.query('DELETE FROM roster WHERE id = ?', [id]);
  }

  async importRoster(entries) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find unique combinations of date and branch_id
      const uniqueCombos = [];
      const comboSet = new Set();
      for (const e of entries) {
        const key = `${e.date}_${e.branch_id}`;
        if (!comboSet.has(key)) {
          comboSet.add(key);
          uniqueCombos.push({ date: e.date, branchId: e.branch_id });
        }
      }

      // Delete existing rosters for those dates and branches
      for (const combo of uniqueCombos) {
        await connection.query(
          `DELETE r FROM roster r JOIN doctors d ON r.doctor_id = d.id
           WHERE r.date = ? AND d.branch_id = ?`,
          [combo.date, combo.branchId]
        );
      }

      if (entries.length > 0) {
        const values = entries.map((e) => [e.date, e.doctor_id, e.timing, e.branch_id, e.location_id]);
        await connection.query('INSERT INTO roster (date, doctor_id, timing, branch_id, location_id) VALUES ?', [values]);
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
