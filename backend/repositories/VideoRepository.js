import { getPool } from '../config/db.js';

class VideoRepository {
  async findByLocation(branch_id, location_id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT v.*, b.name as branch_name, l.name as location_name 
       FROM videos v 
       JOIN branches b ON v.branch_id = b.id 
       JOIN locations l ON v.location_id = l.id 
       WHERE v.branch_id = ? AND v.location_id = ?
       ORDER BY v.play_order ASC, v.created_at ASC`,
      [branch_id, location_id]
    );
    return rows;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT v.*, b.name as branch_name, l.name as location_name 
       FROM videos v 
       JOIN branches b ON v.branch_id = b.id 
       JOIN locations l ON v.location_id = l.id 
       WHERE v.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findAll() {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT v.*, b.name as branch_name, l.name as location_name 
       FROM videos v 
       JOIN branches b ON v.branch_id = b.id 
       JOIN locations l ON v.location_id = l.id 
       ORDER BY v.created_at DESC`
    );
    return rows;
  }

  async insertVideo(data) {
    const pool = getPool();
    const { branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by, play_order } = data;
    
    const [result] = await pool.query(
      `INSERT INTO videos (branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by, play_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by, play_order || 1]
    );
    return { id: result.insertId };
  }

  async deleteById(id) {
    const pool = getPool();
    await pool.query('DELETE FROM videos WHERE id = ?', [id]);
  }
}

export default new VideoRepository();
