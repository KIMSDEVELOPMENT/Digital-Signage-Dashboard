import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

router.get('/branches-locations', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT b.name AS branch, l.name AS location 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE b.status = 1 AND l.status = 1
      ORDER BY b.name, l.name ASC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching branches-locations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
