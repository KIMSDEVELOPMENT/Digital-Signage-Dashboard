import { getPool } from '../config/db.js';

export const getSsccVideoOrder = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sscc_video_order'`);
    if (rows.length > 0) {
      return res.json({ order: rows[0].setting_value });
    }
    return res.json({ order: 'kss' }); // Default
  } catch (error) {
    console.error('Error fetching sscc_video_order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSsccVideoOrder = async (req, res) => {
  try {
    const { order } = req.body;
    if (!['kss', 'kcc'].includes(order)) {
      return res.status(400).json({ message: 'Invalid order value' });
    }
    const pool = getPool();
    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value) VALUES ('sscc_video_order', ?) 
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [order]
    );
    res.json({ message: 'Updated successfully', order });
  } catch (error) {
    console.error('Error updating sscc_video_order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
