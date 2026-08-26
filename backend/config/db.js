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
