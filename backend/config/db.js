import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

/**
 * config/db.js
 * 
 * Contains only the reusable MySQL connection pool.
 * No CREATE TABLE queries. No INSERT queries. No migration logic.
 */

let pool = null;

async function ensureDoctorSittingsSchema() {
  const connection = await pool.getConnection();
  try {
    const [columnRows] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'doctor_sittings'
         AND COLUMN_NAME IN ('branch_id', 'location_id')`
    );

    const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));
    if (existingColumns.has('branch_id') && existingColumns.has('location_id')) {
      return;
    }

    console.log('🔧 Upgrading doctor_sittings schema to branch/location scope...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_sittings_new (
        id INT NOT NULL AUTO_INCREMENT,
        employee_id VARCHAR(50) NOT NULL,
        branch_id INT NOT NULL,
        location_id INT NOT NULL,
        display_days JSON NOT NULL,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_doctor_sitting (employee_id, branch_id, location_id),
        KEY branch_id (branch_id),
        KEY location_id (location_id),
        CONSTRAINT doctor_sittings_new_ibfk_1 FOREIGN KEY (employee_id) REFERENCES doctors (employee_id) ON DELETE CASCADE,
        CONSTRAINT doctor_sittings_new_ibfk_2 FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
        CONSTRAINT doctor_sittings_new_ibfk_3 FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const [existingTableRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_sittings'`
    );

    if (existingTableRows[0].total > 0) {
      await connection.query(`
        INSERT IGNORE INTO doctor_sittings_new (employee_id, branch_id, location_id, display_days)
        SELECT ds.employee_id, da.branch_id, da.location_id, ds.display_days
        FROM doctor_sittings ds
        JOIN doctors d ON d.employee_id = ds.employee_id
        JOIN doctor_assignments da ON da.doctor_id = d.id
      `);
      await connection.query('DROP TABLE doctor_sittings');
    }

    await connection.query('RENAME TABLE doctor_sittings_new TO doctor_sittings');
  } finally {
    connection.release();
  }
}

async function ensureDoctorAssignmentsSchema() {
  const connection = await pool.getConnection();
  try {
    const [columnRows] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'doctor_assignments'
         AND COLUMN_NAME = 'shift_time'`
    );

    if (columnRows.length === 0) {
      console.log('🔧 Adding missing shift_time column to doctor_assignments table...');
      await connection.query(
        `ALTER TABLE doctor_assignments ADD COLUMN shift_time VARCHAR(100) DEFAULT NULL AFTER department_id`
      );
      console.log('✅ Added shift_time column to doctor_assignments table successfully.');
    }
  } catch (error) {
    console.error('Error ensuring doctor_assignments schema:', error);
  } finally {
    connection.release();
  }
}

async function ensureVideosSchema() {
  const connection = await pool.getConnection();
  try {
    const [columnRows] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'videos'
         AND COLUMN_NAME = 'play_order'`
    );

    if (columnRows.length === 0) {
      console.log('🔧 Adding missing play_order column to videos table...');
      await connection.query(
        `ALTER TABLE videos ADD COLUMN play_order INT DEFAULT 1 AFTER uploaded_by`
      );
      console.log('✅ Added play_order column to videos table successfully.');
    }
  } catch (error) {
    console.error('Error ensuring videos schema:', error);
  } finally {
    connection.release();
  }
}

async function ensureDefaultDisplayPlaylists() {
  const connection = await pool.getConnection();
  try {
    const [locs] = await connection.query(
      `SELECT l.id AS location_id, l.branch_id, b.name AS branch_name, l.name AS location_name
       FROM locations l
       JOIN branches b ON l.branch_id = b.id
       WHERE b.status = 1 AND l.status = 1`
    );

    for (const loc of locs) {
      const [pls] = await connection.query(
        'SELECT id FROM display_playlists WHERE screen_branch_id = ? AND screen_location_id = ?',
        [loc.branch_id, loc.location_id]
      );

      if (pls.length === 0) {
        console.log(`🔧 Auto-seeding default display playlist for ${loc.branch_name} / ${loc.location_name}...`);
        const [resPl] = await connection.query(
          'INSERT INTO display_playlists (screen_branch_id, screen_location_id) VALUES (?, ?)',
          [loc.branch_id, loc.location_id]
        );
        const playlistId = resPl.insertId;

        const [resStep] = await connection.query(
          'INSERT INTO display_playlist_steps (playlist_id, step_order, title, duration_seconds) VALUES (?, 1, "All Departments", 10)',
          [playlistId]
        );
        const stepId = resStep.insertId;

        await connection.query(
          'INSERT INTO display_playlist_step_locations (step_id, location_id) VALUES (?, ?)',
          [stepId, loc.location_id]
        );

        console.log(`✅ Default display playlist created for ${loc.branch_name} / ${loc.location_name}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring default display playlists:', error);
  } finally {
    connection.release();
  }
}

/**
 * Initialize the connection pool targeting the application database.
 * Must be called after migrations have completed.
 */
export async function initializePool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_signage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false,
  });

  // Verify connectivity
  const connection = await pool.getConnection();
  console.log('✅ Database pool connected successfully.');
  connection.release();

  await ensureDoctorSittingsSchema();
  await ensureDoctorAssignmentsSchema();
  await ensureVideosSchema();
  await ensureDefaultDisplayPlaylists();

  return pool;
}

/**
 * Returns the active connection pool.
 * Throws if the pool has not been initialized.
 */
export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}
