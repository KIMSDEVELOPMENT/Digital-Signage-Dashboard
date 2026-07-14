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

  /**
   * Server-side paginated query for doctor listing.
   * Supports search, branch/location/department filtering, sorting, and role-based access.
   */
  async findPaginated({
    page = 1,
    limit = 10,
    search = '',
    branch = '',
    location = '',
    departmentId = '',
    sortBy = 'name',
    sortOrder = 'asc',
    // Role-based filter fields (for normal_admin)
    branches = null,
    locations = null,
    departmentIds = null,
  }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    // Whitelist sortable columns
    const allowedSortColumns = {
      id: 'doc.id',
      name: 'doc.name',
      employee_id: 'doc.employee_id',
      designation: 'doc.designation',
      department_name: 'dept.name',
      branch: 'doc.branch',
      location: 'doc.location',
      created_at: 'doc.created_at',
    };
    const sortColumn = allowedSortColumns[sortBy] || 'doc.name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const clauses = [];
    const params = [];
    const countParams = [];

    // Role-based access filters (normal_admin)
    if (branches !== null) {
      if (branches.length === 0) {
        return { data: [], totalRecords: 0 };
      }
      clauses.push(`doc.branch IN (${branches.map(() => '?').join(',')})`);
      params.push(...branches);
      countParams.push(...branches);
    }

    if (locations !== null && locations.length > 0) {
      const locPairs = locations.map(() => '(doc.branch = ? AND doc.location = ?)').join(' OR ');
      clauses.push(`(${locPairs})`);
      locations.forEach((l) => {
        params.push(l.branch, l.location);
        countParams.push(l.branch, l.location);
      });
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      clauses.push(`doc.department_id IN (${departmentIds.map(() => '?').join(',')})`);
      params.push(...departmentIds);
      countParams.push(...departmentIds);
    }

    // User-selected filters (from query params)
    if (branch) {
      clauses.push('doc.branch = ?');
      params.push(branch);
      countParams.push(branch);
    }

    if (location && branch) {
      clauses.push('doc.location = ?');
      params.push(location);
      countParams.push(location);
    }

    if (departmentId) {
      clauses.push('doc.department_id = ?');
      params.push(departmentId);
      countParams.push(departmentId);
    }

    // Search
    if (search) {
      clauses.push('(doc.name LIKE ? OR doc.employee_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    // Data query
    const dataQuery = `
      SELECT doc.*, dept.name AS department_name 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [rows] = await pool.query(dataQuery, params);

    return {
      data: rows.map((r) => new Doctor(r)),
      totalRecords,
    };
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

  async findByNameBranchDepartment(name, branch, departmentId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT doc.*, dept.name AS department_name 
       FROM doctors doc JOIN departments dept ON doc.department_id = dept.id
       WHERE LOWER(doc.name) = LOWER(?) AND LOWER(doc.branch) = LOWER(?) AND doc.department_id = ?`,
      [name, branch, departmentId]
    );
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }
}

export default new DoctorRepository();
