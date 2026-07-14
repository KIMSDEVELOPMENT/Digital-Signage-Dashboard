import { getPool } from '../migrations/db.js';
import { Department } from '../models/Department.js';

/**
 * DepartmentRepository - encapsulates all SQL queries for the departments table.
 */
export class DepartmentRepository {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    return rows.map((r) => new Department(r));
  }

  async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT d.* FROM departments d
       INNER JOIN user_departments ud ON d.id = ud.department_id
       WHERE ud.user_id = ?
       ORDER BY d.name ASC`,
      [userId]
    );
    return rows.map((r) => new Department(r));
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    return rows.length > 0 ? new Department(rows[0]) : null;
  }

  async findByName(name) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM departments WHERE name = ?', [name]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(name) {
    const pool = getPool();
    const [result] = await pool.query('INSERT INTO departments (name) VALUES (?)', [name]);
    return result.insertId;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    return result.affectedRows;
  }

  async hasDoctors(departmentId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM doctors WHERE department_id = ? LIMIT 1', [departmentId]);
    return rows.length > 0;
  }
}

export default new DepartmentRepository();
