import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * config/db.js
 * 
 * Contains only the reusable MySQL connection pool.
 * No CREATE TABLE queries. No INSERT queries. No migration logic.
 */

let pool = null;

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
