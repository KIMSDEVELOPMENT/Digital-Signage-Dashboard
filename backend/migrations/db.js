import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function initializeDatabase() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_signage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();
  try {
    // Create branches_locations table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS branches_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        UNIQUE KEY uniq_branch_location (branch, location)
      ) ENGINE=INNODB;
    `);

    // Seed default data (ignore duplicates)
    const defaultPairs = [
      ['PBMH', 'A Block'],
      ['PBMH', 'B/C Block'],
      ['SSCC', 'KSS'],
      ['SSCC', 'KCC'],
      ['Dental', 'Dental']
    ];
    for (const [branch, location] of defaultPairs) {
      await connection.query(
        'INSERT IGNORE INTO branches_locations (branch, location) VALUES (?, ?)',
        [branch, location]
      );
    }
  } finally {
    connection.release();
  }
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}
