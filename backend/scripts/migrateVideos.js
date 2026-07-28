import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_signage'
  });

  try {
    console.log("Creating non-unique index on branch_id to satisfy FK constraint...");
    await connection.query(`CREATE INDEX branch_id_idx ON videos (branch_id);`).catch(e => console.log(e.message));

    console.log("Dropping unique index...");
    await connection.query(`ALTER TABLE videos DROP INDEX branch_location_idx;`).catch(e => console.log(e.message));

    console.log("Migration finished.");
  } catch(e) {
    console.error(e);
  } finally {
    connection.end();
  }
}

migrate();
