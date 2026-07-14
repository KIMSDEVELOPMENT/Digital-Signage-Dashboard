import { getPool } from '../config/db.js';
import { Department } from '../models/Department.js';

/**
 * DepartmentRepository - encapsulates all SQL queries for the departments table.
 */
export class DepartmentRepository {
  async findAll(branch = '') {
    const pool = getPool();
    let query = 'SELECT * FROM departments';
    const params = [];
    if (branch) {
      query += ' WHERE branch = ?';
      params.push(branch);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Department(r));
  }

  async findByUserId(userId, branch = '') {
    const pool = getPool();
    let query = `SELECT d.* FROM departments d
                 INNER JOIN user_departments ud ON d.id = ud.department_id
                 WHERE ud.user_id = ?`;
    const params = [userId];
    if (branch) {
      query += ' AND d.branch = ?';
      params.push(branch);
    }
    query += ' ORDER BY d.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Department(r));
  }

  /**
   * Server-side paginated query for department listing.
   * Supports search, branch filter, sorting, and role-based filtering.
   */
  async findPaginated({ page = 1, limit = 10, search = '', branch = '', sortBy = 'name', sortOrder = 'asc', userId = null, role = 'super_admin' }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    // Whitelist sortable columns
    const allowedSortColumns = { id: 'd.id', name: 'd.name', branch: 'd.branch', created_at: 'd.created_at' };
    const sortColumn = allowedSortColumns[sortBy] || 'd.name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let baseQuery = '';
    let countQuery = '';
    const params = [];
    const countParams = [];

    if (role === 'normal_admin' && userId) {
      // Normal admin: only departments assigned to them
      baseQuery = `
        SELECT d.* FROM departments d
        INNER JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `;
      countQuery = `
        SELECT COUNT(*) AS total FROM departments d
        INNER JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `;
      params.push(userId);
      countParams.push(userId);
    } else {
      // Super admin: all departments
      baseQuery = 'SELECT d.* FROM departments d WHERE 1=1';
      countQuery = 'SELECT COUNT(*) AS total FROM departments d WHERE 1=1';
    }

    // Branch filter
    if (branch) {
      baseQuery += ' AND d.branch = ?';
      countQuery += ' AND d.branch = ?';
      params.push(branch);
      countParams.push(branch);
    }

    // Search filter
    if (search) {
      baseQuery += ' AND d.name LIKE ?';
      countQuery += ' AND d.name LIKE ?';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // Get total count
    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    // Get paginated data
    baseQuery += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(baseQuery, params);

    return {
      data: rows.map((r) => new Department(r)),
      totalRecords,
    };
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

  async create(name, branch) {
    const pool = getPool();
    const [result] = await pool.query('INSERT INTO departments (name, branch) VALUES (?, ?)', [name, branch || null]);
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
