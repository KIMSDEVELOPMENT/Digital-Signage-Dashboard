import { getPool } from '../config/db.js';
import { Location } from '../models/Location.js';

export class LocationRepository {
  async findAll(status = null, branchId = null) {
    const pool = getPool();
    let query = `
      SELECT l.*, b.name AS branch_name 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (status !== null) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (branchId !== null) {
      query += ' AND l.branch_id = ?';
      params.push(branchId);
    }
    query += ' ORDER BY b.name, l.name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Location(r));
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT l.*, b.name AS branch_name 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE l.id = ?
    `, [id]);
    return rows.length > 0 ? new Location(rows[0]) : null;
  }

  async findByNameAndBranch(name, branchId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM locations WHERE name = ? AND branch_id = ?', [name, branchId]);
    return rows.length > 0 ? new Location(rows[0]) : null;
  }

  async create({ branch_id, name, status = 1 }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO locations (branch_id, name, status) VALUES (?, ?, ?)',
      [branch_id, name, status]
    );
    return result.insertId;
  }

  async update(id, { branch_id, name, status }) {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE locations SET branch_id = ?, name = ?, status = ? WHERE id = ?',
      [branch_id, name, status, id]
    );
    return result.affectedRows;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM locations WHERE id = ?', [id]);
    return result.affectedRows;
  }

  async findPaginated({ page = 1, limit = 10, search = '', branchId = null, sortBy = 'name', sortOrder = 'asc' }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const allowedSortColumns = { 
      id: 'l.id', 
      name: 'l.name', 
      status: 'l.status', 
      branch_name: 'b.name',
      created_at: 'l.created_at', 
      updated_at: 'l.updated_at' 
    };
    const sortColumn = allowedSortColumns[sortBy] || 'l.name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let baseQuery = `
      SELECT l.*, b.name AS branch_name 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (branchId !== null) {
      baseQuery += ' AND l.branch_id = ?';
      countQuery += ' AND l.branch_id = ?';
      params.push(branchId);
      countParams.push(branchId);
    }

    if (search) {
      baseQuery += ' AND (l.name LIKE ? OR b.name LIKE ?)';
      countQuery += ' AND (l.name LIKE ? OR b.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    baseQuery += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(baseQuery, params);

    return {
      data: rows.map((r) => new Location(r)),
      totalRecords,
    };
  }

  async hasDependencies(locationId) {
    const pool = getPool();
    const [depts] = await pool.query('SELECT id FROM departments WHERE location_id = ? LIMIT 1', [locationId]);
    if (depts.length > 0) return true;

    const [docs] = await pool.query('SELECT id FROM doctors WHERE location_id = ? LIMIT 1', [locationId]);
    if (docs.length > 0) return true;

    return false;
  }
}

export default new LocationRepository();
