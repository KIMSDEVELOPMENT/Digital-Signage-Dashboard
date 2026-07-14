import { getPool } from '../config/db.js';
import { Branch } from '../models/Branch.js';

export class BranchRepository {
  async findAll(status = null) {
    const pool = getPool();
    let query = 'SELECT * FROM branches';
    const params = [];
    if (status !== null) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new Branch(r));
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
    return rows.length > 0 ? new Branch(rows[0]) : null;
  }

  async findByName(name) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM branches WHERE name = ?', [name]);
    return rows.length > 0 ? new Branch(rows[0]) : null;
  }

  async create({ name, status = 1 }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO branches (name, status) VALUES (?, ?)',
      [name, status]
    );
    return result.insertId;
  }

  async update(id, { name, status }) {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE branches SET name = ?, status = ? WHERE id = ?',
      [name, status, id]
    );
    return result.affectedRows;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM branches WHERE id = ?', [id]);
    return result.affectedRows;
  }

  async findPaginated({ page = 1, limit = 10, search = '', sortBy = 'name', sortOrder = 'asc' }) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const allowedSortColumns = { id: 'id', name: 'name', status: 'status', created_at: 'created_at', updated_at: 'updated_at' };
    const sortColumn = allowedSortColumns[sortBy] || 'name';
    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let baseQuery = 'SELECT * FROM branches WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) AS total FROM branches WHERE 1=1';
    const params = [];
    const countParams = [];

    if (search) {
      baseQuery += ' AND name LIKE ?';
      countQuery += ' AND name LIKE ?';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const [countRows] = await pool.query(countQuery, countParams);
    const totalRecords = countRows[0].total;

    baseQuery += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(baseQuery, params);

    return {
      data: rows.map((r) => new Branch(r)),
      totalRecords,
    };
  }

  async hasDependencies(branchId) {
    const pool = getPool();
    // Check if branch has locations, departments, or doctors
    const [locs] = await pool.query('SELECT id FROM locations WHERE branch_id = ? LIMIT 1', [branchId]);
    if (locs.length > 0) return true;

    const [depts] = await pool.query('SELECT id FROM departments WHERE branch_id = ? LIMIT 1', [branchId]);
    if (depts.length > 0) return true;

    const [docs] = await pool.query('SELECT id FROM doctors WHERE branch_id = ? LIMIT 1', [branchId]);
    if (docs.length > 0) return true;

    return false;
  }
}

export default new BranchRepository();
