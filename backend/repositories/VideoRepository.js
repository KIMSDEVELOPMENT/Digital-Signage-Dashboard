import { getPool } from '../config/db.js';

class VideoRepository {
  async findByLocation(branch_id, location_id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT v.*, b.name as branch_name, l.name as location_name 
       FROM videos v 
       JOIN branches b ON v.branch_id = b.id 
       JOIN locations l ON v.location_id = l.id 
       WHERE v.branch_id = ? AND v.location_id = ?`,
      [branch_id, location_id]
    );
    return rows[0] || null;
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

  async upsertVideo(data) {
    const pool = getPool();
    const { branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by } = data;
    
    // Check if exists
    const existing = await this.findByLocation(branch_id, location_id);
    if (existing) {
      await pool.query(
        `UPDATE videos 
         SET title = ?, file_path = ?, original_name = ?, file_size = ?, duration = ?, uploaded_by = ? 
         WHERE id = ?`,
        [title, file_path, original_name, file_size, duration, uploaded_by, existing.id]
      );
      return { id: existing.id, oldFilePath: existing.file_path };
    } else {
      const [result] = await pool.query(
        `INSERT INTO videos (branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [branch_id, location_id, title, file_path, original_name, file_size, duration, uploaded_by]
      );
      return { id: result.insertId, oldFilePath: null };
    }
  }

  async deleteById(id) {
    const pool = getPool();
    await pool.query('DELETE FROM videos WHERE id = ?', [id]);
  }
}

export default new VideoRepository();
