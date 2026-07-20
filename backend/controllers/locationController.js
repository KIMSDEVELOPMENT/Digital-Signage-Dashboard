import { getPool } from '../config/db.js';

export const getLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const pool = getPool();
    
    let query = `
      SELECT l.*, b.name as branch_name 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (search) {
      query += ` AND (l.name LIKE ? OR b.name LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Count total rows
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS sub`;
    const [countRows] = await pool.query(countQuery, queryParams);
    const total = countRows[0].total;

    // Fetch paginated rows
    query += ` ORDER BY l.id DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [rows] = await pool.query(query, queryParams);

    res.json({
      data: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch locations.' });
  }
};

export const createLocation = async (req, res) => {
  try {
    const { branch_id, name, status } = req.body;
    
    if (!branch_id || !name) {
      return res.status(400).json({ message: 'Branch ID and Location name are required.' });
    }

    const pool = getPool();
    
    // Check for duplicates
    const [existing] = await pool.query(
      'SELECT id FROM locations WHERE branch_id = ? AND name = ?',
      [branch_id, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'This location already exists for the selected branch.' });
    }

    const [result] = await pool.query(
      'INSERT INTO locations (branch_id, name, status) VALUES (?, ?, ?)',
      [branch_id, name.trim(), status !== undefined ? status : 1]
    );

    res.status(201).json({ message: 'Location created successfully.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create location.' });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, name, status } = req.body;

    if (!branch_id || !name) {
      return res.status(400).json({ message: 'Branch ID and Location name are required.' });
    }

    const pool = getPool();

    // Check for duplicates
    const [existing] = await pool.query(
      'SELECT id FROM locations WHERE branch_id = ? AND name = ? AND id != ?',
      [branch_id, name.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Another location with this name already exists for the selected branch.' });
    }

    await pool.query(
      'UPDATE locations SET branch_id = ?, name = ?, status = ? WHERE id = ?',
      [branch_id, name.trim(), status !== undefined ? status : 1, id]
    );

    res.json({ message: 'Location updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update location.' });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Soft delete by setting status = 0
    await pool.query('UPDATE locations SET status = 0 WHERE id = ?', [id]);
    
    res.json({ message: 'Location deactivated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete location.' });
  }
};
