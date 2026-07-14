import { initializePool } from './config/db.js';

async function main() {
  try {
    const pool = await initializePool();
    const [rows] = await pool.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'digital_signage' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
