import { getPool } from '../migrations/db.js';
import { User } from '../models/User.js';

/**
 * UserRepository - encapsulates all SQL queries for the users table
 * and its related permission/assignment tables.
 */
export class UserRepository {
  // ─── Users ────────────────────────────────────────────────────────────────

  async findByUsername(username) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR employee_id = ?',
      [username, username]
    );
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, employee_id, full_name, username, password, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  async findAdmins(search = null) {
    const pool = getPool();
    let query = 'SELECT id, employee_id, full_name, username, role, created_at FROM users WHERE role = "normal_admin"';
    const params = [];

    if (search) {
      query += ' AND (username LIKE ? OR full_name LIKE ? OR employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY full_name ASC';
    const [rows] = await pool.query(query, params);
    return rows.map((r) => new User(r));
  }

  async isUsernameTaken(username) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    return rows.length > 0;
  }

  async isEmployeeIdTaken(employee_id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM users WHERE employee_id = ?', [employee_id]);
    return rows.length > 0;
  }

  async createAdmin({ employee_id, full_name, username, hashedPassword }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO users (employee_id, full_name, username, password, role) VALUES (?, ?, ?, ?, "normal_admin")',
      [employee_id || null, full_name, username, hashedPassword]
    );
    return result.insertId;
  }

  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
  }

  async updatePassword(id, hashedPassword) {
    const pool = getPool();
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  }

  async findAdminById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, employee_id, full_name, username, role FROM users WHERE id = ? AND role = "normal_admin"',
      [id]
    );
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  // ─── Branches ──────────────────────────────────────────────────────────────

  async getUserBranches(userId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT branch FROM user_branches WHERE user_id = ?', [userId]);
    return rows.map((r) => r.branch);
  }

  async addUserBranch(userId, branch) {
    const pool = getPool();
    await pool.query(
      'INSERT INTO user_branches (user_id, branch) VALUES (?, ?) ON DUPLICATE KEY UPDATE branch=branch',
      [userId, branch]
    );
  }

  async hasBranchAccess(userId, branch) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id FROM user_branches WHERE user_id = ? AND branch = ?',
      [userId, branch]
    );
    return rows.length > 0;
  }

  // ─── Locations ─────────────────────────────────────────────────────────────

  async getUserLocations(userId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT branch, location FROM user_locations WHERE user_id = ?', [userId]);
    return rows;
  }

  async addUserLocation(userId, branch, location) {
    const pool = getPool();
    await pool.query(
      'INSERT INTO user_locations (user_id, branch, location) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE location=location',
      [userId, branch, location]
    );
  }

  // ─── Departments ───────────────────────────────────────────────────────────

  async getUserDepartments(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ud.department_id, d.name AS department_name 
       FROM user_departments ud
       JOIN departments d ON ud.department_id = d.id
       WHERE ud.user_id = ?`,
      [userId]
    );
    return rows;
  }

  async getUserDepartmentIds(userId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT department_id FROM user_departments WHERE user_id = ?', [userId]);
    return rows.map((r) => r.department_id);
  }

  // ─── Modules / Permissions ─────────────────────────────────────────────────

  async getModulePermission(userId, moduleName, action) {
    const pool = getPool();
    const columnMap = { read: 'can_read', create: 'can_create', update: 'can_update', delete: 'can_delete' };
    const column = columnMap[action];
    const [rows] = await pool.query(
      `SELECT ${column} FROM user_permissions WHERE user_id = ? AND module_name = ?`,
      [userId, moduleName]
    );
    return rows.length > 0 ? !!rows[0][column] : false;
  }

  async getUserModules(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT module_name, can_read, can_create, can_update, can_delete FROM user_permissions WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  async seedDefaultPermissions(userId, modules) {
    const pool = getPool();
    for (const module of modules) {
      await pool.query(
        'INSERT IGNORE INTO user_permissions (user_id, module_name, can_read, can_create, can_update, can_delete) VALUES (?, ?, 1, 0, 0, 0)',
        [userId, module]
      );
    }
  }

  // ─── Transactional Permission Update ───────────────────────────────────────

  async updateAdminPermissions(userId, { branches, locations, departments, modules }) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('DELETE FROM user_branches WHERE user_id = ?', [userId]);
      if (branches?.length > 0) {
        const vals = branches.map((b) => [userId, b]);
        await connection.query('INSERT INTO user_branches (user_id, branch) VALUES ?', [vals]);
      }

      await connection.query('DELETE FROM user_locations WHERE user_id = ?', [userId]);
      if (locations?.length > 0) {
        const vals = locations.map((l) => [userId, l.branch, l.location]);
        await connection.query('INSERT INTO user_locations (user_id, branch, location) VALUES ?', [vals]);
      }

      await connection.query('DELETE FROM user_departments WHERE user_id = ?', [userId]);
      if (departments?.length > 0) {
        const vals = departments.map((d) => [userId, d]);
        await connection.query('INSERT INTO user_departments (user_id, department_id) VALUES ?', [vals]);
      }

      await connection.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
      if (modules && Object.keys(modules).length > 0) {
        const vals = Object.entries(modules).map(([moduleName, perms]) => [
          userId, moduleName,
          perms.read ? 1 : 0, perms.create ? 1 : 0, perms.update ? 1 : 0, perms.delete ? 1 : 0,
        ]);
        await connection.query(
          'INSERT INTO user_permissions (user_id, module_name, can_read, can_create, can_update, can_delete) VALUES ?',
          [vals]
        );
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

export default new UserRepository();
