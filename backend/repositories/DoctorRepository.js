import { getPool } from '../config/db.js';
import { Doctor } from '../models/Doctor.js';

export class DoctorRepository {
  
  _getSelectQuery() {
    return `
      SELECT doc.id, doc.employee_id, doc.name, doc.designation, doc.photo_url, doc.status, doc.created_at, doc.updated_at,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', da.id,
          'branch_id', da.branch_id,
          'branch_name', b.name,
          'location_id', da.location_id,
          'location_name', l.name,
          'department_id', da.department_id,
          'department_name', dept.name
        )
      ) AS assignments
      FROM doctors doc
      JOIN doctor_assignments da ON doc.id = da.doctor_id
        JOIN branches b ON da.branch_id = b.id AND b.status = 1
        JOIN locations l ON da.location_id = l.id AND l.status = 1
        JOIN departments dept ON da.department_id = dept.id AND dept.status = 1
    `;
  }

  async findWithFilters({ branches = null, locations = null, departmentIds = null, search = null, status = 1 } = {}) {
    const pool = getPool();
    let query = this._getSelectQuery() + ' WHERE 1=1';
    const params = [];
    
    if (status !== null) {
      query += ' AND doc.status = ?';
      params.push(status);
    }

    if (branches !== null && branches.length > 0) {
      const placeholders = branches.map(() => '?').join(',');
      if (typeof branches[0] === 'number' || !isNaN(branches[0])) {
        query += ` AND da.branch_id IN (${placeholders})`;
      } else {
        query += ` AND b.name IN (${placeholders})`;
      }
      params.push(...branches);
    }

    if (locations !== null && locations.length > 0) {
      const placeholders = locations.map(() => '?').join(',');
      if (typeof locations[0] === 'number' || !isNaN(locations[0])) {
        query += ` AND da.location_id IN (${placeholders})`;
      } else {
        query += ` AND l.name IN (${placeholders})`;
      }
      params.push(...locations);
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      query += ` AND da.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    if (search) {
      query += ' AND (doc.name LIKE ? OR doc.name LIKE ? OR doc.employee_id LIKE ? OR doc.designation LIKE ? OR doc.designation LIKE ?)';
      params.push(`${search}%`, `% ${search}%`, `%${search}%`, `${search}%`, `% ${search}%`);
    }

    query += ' GROUP BY doc.id ORDER BY doc.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Doctor(r));
  }

  async findPaginated({ page = 1, limit = 10, search = '', branchId = null, locationId = null, departmentId = null, status = null, sortBy = 'name', sortOrder = 'asc', branches = null, locations = null, departmentIds = null }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const allowedSortColumns = {
      id: 'doc.id', name: 'doc.name', employee_id: 'doc.employee_id', designation: 'doc.designation', status: 'doc.status', created_at: 'doc.created_at', updated_at: 'doc.updated_at'
    };
    const sortColumn = allowedSortColumns[sortBy] || 'doc.name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const clauses = [];
    const params = [];
    const countParams = [];

    // Role-based access filters (normal_admin)
    if (branches !== null) {
      if (branches.length === 0) return { data: [], totalRecords: 0 };
      const placeholders = branches.map(() => '?').join(',');
      if (typeof branches[0] === 'number' || !isNaN(branches[0])) {
        clauses.push(`da.branch_id IN (${placeholders})`);
      } else {
        clauses.push(`b.name IN (${placeholders})`);
      }
      params.push(...branches);
      countParams.push(...branches);
    }

    if (departmentIds !== null && departmentIds.length > 0) {
      clauses.push(`da.department_id IN (${departmentIds.map(() => '?').join(',')})`);
      params.push(...departmentIds);
      countParams.push(...departmentIds);
    }

    if (branchId) {
      if (isNaN(branchId)) clauses.push('b.name = ?'); else clauses.push('da.branch_id = ?');
      params.push(branchId);
      countParams.push(branchId);
    }

    if (locationId) {
      if (isNaN(locationId)) clauses.push('l.name = ?'); else clauses.push('da.location_id = ?');
      params.push(locationId);
      countParams.push(locationId);
    }

    if (departmentId) {
      clauses.push('da.department_id = ?');
      params.push(departmentId);
      countParams.push(departmentId);
    }

    if (status !== null) {
      clauses.push('doc.status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      // Matches if the string starts with the search term OR if any word starts with the search term
      clauses.push('(doc.name LIKE ? OR doc.name LIKE ? OR doc.employee_id LIKE ? OR doc.designation LIKE ? OR doc.designation LIKE ?)');
      params.push(`${search}%`, `% ${search}%`, `%${search}%`, `${search}%`, `% ${search}%`);
      countParams.push(`${search}%`, `% ${search}%`, `%${search}%`, `${search}%`, `% ${search}%`);
    }

    const whereClause = clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : '';

    const countQuery = `
      SELECT COUNT(DISTINCT doc.id) AS total 
      FROM doctors doc
      JOIN doctor_assignments da ON doc.id = da.doctor_id
        JOIN branches b ON da.branch_id = b.id AND b.status = 1
        JOIN locations l ON da.location_id = l.id AND l.status = 1
        JOIN departments dept ON da.department_id = dept.id AND dept.status = 1
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    const dataQuery = `
      ${this._getSelectQuery()}
      ${whereClause}
      GROUP BY doc.id
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
    const [rows] = await pool.query(this._getSelectQuery() + ' WHERE doc.employee_id = ? GROUP BY doc.id', [employeeId]);
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(this._getSelectQuery() + ' WHERE doc.id = ? GROUP BY doc.id', [id]);
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }

  async isEmployeeIdTakenGlobally(employeeId, excludeId = null) {
    const pool = getPool();
    let query = 'SELECT id FROM doctors WHERE employee_id = ?';
    const params = [employeeId];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  }

  async createDoctor({ employee_id, name, designation, photo_url, status = 1 }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO doctors (employee_id, name, designation, photo_url, status) VALUES (?, ?, ?, ?, ?)',
      [employee_id, name, designation, photo_url, status]
    );
    return result.insertId;
  }

  async updateDoctor(id, { employee_id, name, designation, photo_url, status }) {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE doctors SET employee_id = ?, name = ?, designation = ?, photo_url = ?, status = ? WHERE id = ?',
      [employee_id, name, designation, photo_url, status, id]
    );
    return result.affectedRows;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [id]);
    return result.affectedRows;
  }
  
  async syncAssignments(doctorId, assignments) {
    const pool = getPool();
    // Start transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete existing assignments for this doctor
      await connection.query('DELETE FROM doctor_assignments WHERE doctor_id = ?', [doctorId]);
      
      // Insert new ones if any
      if (assignments && assignments.length > 0) {
        const values = assignments.map(a => [doctorId, a.branch_id, a.location_id, a.department_id]);
        await connection.query(
          'INSERT INTO doctor_assignments (doctor_id, branch_id, location_id, department_id) VALUES ?',
          [values]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findByNameBranchDepartment(name, branchId, departmentId) {
    const pool = getPool();
    const [rows] = await pool.query(
      this._getSelectQuery() + `
       WHERE LOWER(doc.name) = LOWER(?) AND da.branch_id = ? AND da.department_id = ?
       GROUP BY doc.id
      `,
      [name, branchId, departmentId]
    );
    return rows.length > 0 ? new Doctor(rows[0]) : null;
  }
}

export default new DoctorRepository();
