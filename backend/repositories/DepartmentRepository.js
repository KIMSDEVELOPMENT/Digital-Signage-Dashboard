import { getPool } from '../config/db.js';
import { Department } from '../models/Department.js';

/**
 * DepartmentRepository - encapsulates SQL queries for the departments table.
 */
export class DepartmentRepository {
  async findAll(branchId = null, locationId = null, status = null) {
    const pool = getPool();
    let query = `
      SELECT d.*, b.name AS branch_name, l.name AS location_name 
      FROM departments d
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    if (branchId) {
      // Support passing both branch string or branch numeric ID
      if (isNaN(branchId)) {
        query += ' AND b.name = ?';
      } else {
        query += ' AND d.branch_id = ?';
      }
      params.push(branchId);
    }
    if (locationId) {
      if (isNaN(locationId)) {
        query += ' AND l.name = ?';
      } else {
        query += ' AND d.location_id = ?';
      }
      params.push(locationId);
    }
    if (status !== null) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    query += ' ORDER BY d.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Department(r));
  }

  async findByUserId(userId, branchId = null, locationId = null) {
    const pool = getPool();
    let query = `
      SELECT d.*, b.name AS branch_name, l.name AS location_name 
      FROM departments d
      INNER JOIN user_departments ud ON d.id = ud.department_id
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      WHERE ud.user_id = ?
    `;
    const params = [userId];
    if (branchId) {
      if (isNaN(branchId)) {
        query += ' AND b.name = ?';
      } else {
        query += ' AND d.branch_id = ?';
      }
      params.push(branchId);
    }
    if (locationId) {
      if (isNaN(locationId)) {
        query += ' AND l.name = ?';
      } else {
        query += ' AND d.location_id = ?';
      }
      params.push(locationId);
    }
    query += ' ORDER BY d.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Department(r));
  }

  /**
   * Server-side paginated query for department listing.
   * Supports search, branch/location filter, sorting, status, and role-based filtering.
   */
  async findPaginated({
    page = 1,
    limit = 10,
    search = '',
    branchId = null,
    locationId = null,
    status = null,
    sortBy = 'name',
    sortOrder = 'asc',
    userId = null,
    role = 'super_admin'
  }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const allowedSortColumns = {
      id: 'd.id',
      name: 'd.name',
      status: 'd.status',
      branch_name: 'b.name',
      location_name: 'l.name',
      created_at: 'd.created_at',
      updated_at: 'd.updated_at'
    };
    const sortColumn = allowedSortColumns[sortBy] || 'd.name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let baseQuery = `
      SELECT d.*, b.name AS branch_name, l.name AS location_name 
      FROM departments d
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM departments d
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    // Role-based filtering
    if (role === 'normal_admin' && userId) {
      const normalAdminClause = ' AND d.id IN (SELECT department_id FROM user_departments WHERE user_id = ?)';
      baseQuery += normalAdminClause;
      countQuery += normalAdminClause;
      params.push(userId);
      countParams.push(userId);
    }

    // Branch filter
    if (branchId) {
      if (isNaN(branchId)) {
        baseQuery += ' AND b.name = ?';
        countQuery += ' AND b.name = ?';
      } else {
        baseQuery += ' AND d.branch_id = ?';
        countQuery += ' AND d.branch_id = ?';
      }
      params.push(branchId);
      countParams.push(branchId);
    }

    // Location filter
    if (locationId) {
      if (isNaN(locationId)) {
        baseQuery += ' AND l.name = ?';
        countQuery += ' AND l.name = ?';
      } else {
        baseQuery += ' AND d.location_id = ?';
        countQuery += ' AND d.location_id = ?';
      }
      params.push(locationId);
      countParams.push(locationId);
    }

    // Status filter
    if (status !== null) {
      baseQuery += ' AND d.status = ?';
      countQuery += ' AND d.status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Search filter
    if (search) {
      baseQuery += ' AND (d.name LIKE ? OR b.name LIKE ? OR l.name LIKE ?)';
      countQuery += ' AND (d.name LIKE ? OR b.name LIKE ? OR l.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

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
    const [rows] = await pool.query(`
      SELECT d.*, b.name AS branch_name, l.name AS location_name 
      FROM departments d
      JOIN branches b ON d.branch_id = b.id
      JOIN locations l ON d.location_id = l.id
      WHERE d.id = ?
    `, [id]);
    return rows.length > 0 ? new Department(rows[0]) : null;
  }

  async findByNameAndBranchLocation(name, branchId, locationId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id FROM departments WHERE name = ? AND branch_id = ? AND location_id = ?',
      [name, branchId, locationId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create({ name, branch_id, location_id, status = 1 }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO departments (name, branch_id, location_id, status) VALUES (?, ?, ?, ?)',
      [name, branch_id, location_id, status]
    );
    return result.insertId;
  }

  async update(id, { name, branch_id, location_id, status }) {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE departments SET name = ?, branch_id = ?, location_id = ?, status = ? WHERE id = ?',
      [name, branch_id, location_id, status, id]
    );
    return result.affectedRows;
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
