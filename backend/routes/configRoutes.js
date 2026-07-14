import express from 'express';
import { getPool } from '../migrations/db.js';

const router = express.Router();

router.get('/branches-locations', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT branch, location FROM branches_locations ORDER BY branch, location ASC');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching branches-locations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
