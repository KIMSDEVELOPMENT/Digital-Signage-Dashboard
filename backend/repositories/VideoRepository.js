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

  async updateVideo(id, data) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (data.branch_id !== undefined) { fields.push('branch_id = ?'); values.push(data.branch_id); }
    if (data.location_id !== undefined) { fields.push('location_id = ?'); values.push(data.location_id); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.play_order !== undefined) { fields.push('play_order = ?'); values.push(data.play_order); }
    if (data.file_path !== undefined) { fields.push('file_path = ?'); values.push(data.file_path); }
    if (data.original_name !== undefined) { fields.push('original_name = ?'); values.push(data.original_name); }
    if (data.file_size !== undefined) { fields.push('file_size = ?'); values.push(data.file_size); }
    if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }

    if (fields.length === 0) return;
    values.push(id);

    await pool.query(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export default new VideoRepository();
