import { getPool } from '../config/db.js';
import { Doctor } from '../models/Doctor.js';

/**
 * DoctorRepository - encapsulates all SQL queries for the doctors table.
 */
export class DoctorRepository {
  async findWithFilters({ branches = null, locations = null, departmentIds = null, search = null } = {}) {
    const pool = getPool();
    let query = `
      SELECT doc.*, dept.name AS department_name 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
    `;
    const params = [];
    const clauses = [];

    if (branches !== null) {
      if (branches.length === 0) return [];
      clauses.push(`doc.branch IN (${branches.map(() => '?').join(',')})`);
      params.push(...branches);
    }

    if (locations !== null && locations.length > 0) {
      const locPairs = locations.map(() => '(doc.branch = ? AND doc.location = ?)').join(' OR ');
      clauses.push(`(${locPairs})`);
      locations.forEach((l) => { params.push(l.branch, l.location); });
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      clauses.push(`doc.department_id IN (${departmentIds.map(() => '?').join(',')})`);
      params.push(...departmentIds);
    }

    if (search) {
      clauses.push('(doc.name LIKE ? OR doc.employee_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ');
    }

    query += ' ORDER BY doc.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Doctor(r));
  }

  async findByEmployeeId(employeeId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT doc.*, dept.name AS department_name 
       FROM doctors doc JOIN departments dept ON doc.department_id = dept.id
       WHERE doc.employee_id = ?`,
      [employeeId]
    );
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }

  async isEmployeeIdTaken(employeeId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM doctors WHERE employee_id = ?', [employeeId]);
    return rows.length > 0;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT photo_url, branch, location, name FROM doctors WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create({ employee_id, name, designation, department_id, branch, location, photo_url }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO doctors (employee_id, name, designation, department_id, branch, location, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [employee_id, name, designation, department_id, branch, location, photo_url]
    );
    return result.insertId;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

export default new DoctorRepository();
