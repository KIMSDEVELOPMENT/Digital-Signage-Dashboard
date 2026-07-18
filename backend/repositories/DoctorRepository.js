import { getPool } from '../config/db.js';
import { Doctor } from '../models/Doctor.js';

/**
 * DoctorRepository - encapsulates SQL queries for the doctors table.
 */
export class DoctorRepository {
  async findWithFilters({ branches = null, locations = null, departmentIds = null, search = null, status = 1 } = {}) {
    const pool = getPool();
    let query = `
      SELECT doc.*, dept.name AS department_name, b.name AS branch, l.name AS location 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      JOIN branches b ON doc.branch_id = b.id
      JOIN locations l ON doc.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status !== null) {
      query += ' AND doc.status = ?';
      params.push(status);
    }

    if (branches !== null) {
      if (branches.length === 0) return [];
      // Support array of branch names or IDs
      const placeholders = branches.map(() => '?').join(',');
      if (typeof branches[0] === 'number' || !isNaN(branches[0])) {
        query += ` AND doc.branch_id IN (${placeholders})`;
      } else {
        query += ` AND b.name IN (${placeholders})`;
      }
      params.push(...branches);
    }

    if (locations !== null && locations.length > 0) {
      // Support legacy location filters: [{ branch, location }]
      const locPairs = locations.map(() => '(b.name = ? AND l.name = ?)').join(' OR ');
      query += ` AND (${locPairs})`;
      locations.forEach((loc) => { params.push(loc.branch, loc.location); });
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      query += ` AND doc.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    if (search) {
      query += ' AND (doc.name LIKE ? OR doc.employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY doc.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Doctor(r));
  }

  /**
   * Server-side paginated query for doctor listing.
   * Supports search, branch/location/department filtering, sorting, status, and role-based access.
   */
  async findPaginated({
    page = 1,
    limit = 10,
    search = '',
    branchId = null,
    locationId = null,
    departmentId = null,
    status = null,
    sortBy = 'name',
    sortOrder = 'asc',
    // Role-based filter fields
    branches = null,
    locations = null,
    departmentIds = null,
  }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const allowedSortColumns = {
      id: 'doc.id',
      name: 'doc.name',
      employee_id: 'doc.employee_id',
      designation: 'doc.designation',
      department_name: 'dept.name',
      branch: 'b.name',
      location: 'l.name',
      status: 'doc.status',
      created_at: 'doc.created_at',
      updated_at: 'doc.updated_at'
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
      const placeholders = branches.map(() => '?').join(',');
      if (typeof branches[0] === 'number' || !isNaN(branches[0])) {
        clauses.push(`doc.branch_id IN (${placeholders})`);
      } else {
        clauses.push(`b.name IN (${placeholders})`);
      }
      params.push(...branches);
      countParams.push(...branches);
    }

    if (locations !== null && locations.length > 0) {
      const locPairs = locations.map(() => '(b.name = ? AND l.name = ?)').join(' OR ');
      clauses.push(`(${locPairs})`);
      locations.forEach((loc) => {
        params.push(loc.branch, loc.location);
        countParams.push(loc.branch, loc.location);
      });
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      clauses.push(`doc.department_id IN (${departmentIds.map(() => '?').join(',')})`);
      params.push(...departmentIds);
      countParams.push(...departmentIds);
    }

    // User-selected filters
    if (branchId) {
      if (isNaN(branchId)) {
        clauses.push('b.name = ?');
      } else {
        clauses.push('doc.branch_id = ?');
      }
      params.push(branchId);
      countParams.push(branchId);
    }

    if (locationId) {
      if (isNaN(locationId)) {
        clauses.push('l.name = ?');
      } else {
        clauses.push('doc.location_id = ?');
      }
      params.push(locationId);
      countParams.push(locationId);
    }

    if (departmentId) {
      clauses.push('doc.department_id = ?');
      params.push(departmentId);
      countParams.push(departmentId);
    }

    if (status !== null) {
      clauses.push('doc.status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      clauses.push('(doc.name LIKE ? OR doc.employee_id LIKE ? OR doc.designation LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : '';

    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      JOIN branches b ON doc.branch_id = b.id
      JOIN locations l ON doc.location_id = l.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    const dataQuery = `
      SELECT doc.*, dept.name AS department_name, b.name AS branch, l.name AS location 
      FROM doctors doc
      JOIN departments dept ON doc.department_id = dept.id
      JOIN branches b ON doc.branch_id = b.id
      JOIN locations l ON doc.location_id = l.id
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
      `SELECT doc.*, dept.name AS department_name, b.name AS branch, l.name AS location 
       FROM doctors doc 
       JOIN departments dept ON doc.department_id = dept.id
       JOIN branches b ON doc.branch_id = b.id
       JOIN locations l ON doc.location_id = l.id
       WHERE doc.employee_id = ?`,
      [employeeId]
    );
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }

  async findByEmployeeIdAndBranch(employeeId, branchIdOrName) {
    const pool = getPool();
    let query = `
      SELECT doc.*, dept.name AS department_name, b.name AS branch, l.name AS location 
      FROM doctors doc 
      JOIN departments dept ON doc.department_id = dept.id
      JOIN branches b ON doc.branch_id = b.id
      JOIN locations l ON doc.location_id = l.id
      WHERE doc.employee_id = ?
    `;
    const params = [employeeId];
    if (typeof branchIdOrName === 'number' || !isNaN(branchIdOrName)) {
      query += ' AND doc.branch_id = ?';
    } else {
      query += ' AND b.name = ?';
    }
    params.push(branchIdOrName);
    const [rows] = await pool.query(query, params);
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }

  async isEmployeeIdTaken(employeeId, branchId, excludeId = null) {
    const pool = getPool();
    let query = 'SELECT id FROM doctors WHERE employee_id = ? AND branch_id = ?';
    const params = [employeeId, branchId];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT doc.*, b.name AS branch, l.name AS location 
      FROM doctors doc
      JOIN branches b ON doc.branch_id = b.id
      JOIN locations l ON doc.location_id = l.id
      WHERE doc.id = ?
    `, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create({ employee_id, name, designation, department_id, branch_id, location_id, photo_url, status = 1 }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO doctors (employee_id, name, designation, department_id, branch_id, location_id, photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_id, name, designation, department_id, branch_id, location_id, photo_url, status]
    );
    return result.insertId;
  }

  async update(id, { employee_id, name, designation, department_id, branch_id, location_id, photo_url, status }) {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE doctors SET employee_id = ?, name = ?, designation = ?, department_id = ?, branch_id = ?, location_id = ?, photo_url = ?, status = ? WHERE id = ?',
      [employee_id, name, designation, department_id, branch_id, location_id, photo_url, status, id]
    );
    return result.affectedRows;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [id]);
    return result.affectedRows;
  }

  async findByNameBranchDepartment(name, branchId, departmentId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT doc.*, dept.name AS department_name, b.name AS branch, l.name AS location 
       FROM doctors doc 
       JOIN departments dept ON doc.department_id = dept.id
       JOIN branches b ON doc.branch_id = b.id
       JOIN locations l ON doc.location_id = l.id
       WHERE LOWER(doc.name) = LOWER(?) AND doc.branch_id = ? AND doc.department_id = ?`,
      [name, branchId, departmentId]
    );
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }
}

export default new DoctorRepository();
