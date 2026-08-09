import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function escapeString(str) {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function formatDate(date) {
  if (!date) return 'NULL';
  return `'${new Date(date).toISOString().slice(0, 19).replace('T', ' ')}'`;
}

async function exportTableData(pool, tableName, columns) {
  const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
  if (rows.length === 0) return '';

  let sql = `INSERT IGNORE INTO ${tableName} (${columns.map(c => `\`${c.name}\``).join(', ')}) VALUES\n`;
  
  const values = rows.map(row => {
    const rowValues = columns.map(c => {
      const val = row[c.name];
      if (val === null) return 'NULL';
      if (c.type === 'string') return escapeString(val);
      if (c.type === 'date') return formatDate(val);
      return val;
    });
    return `  (${rowValues.join(', ')})`;
  });

  sql += values.join(',\n') + ';\n\n';
  return sql;
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_signage'
  });

  try {
    let finalSql = '-- Seed script for core hierarchy data\n\n';

    // 1. Branches
    finalSql += '-- Branches\n';
    finalSql += await exportTableData(pool, 'branches', [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'status', type: 'number' },
      { name: 'created_at', type: 'date' },
      { name: 'updated_at', type: 'date' }
    ]);

    // 2. Locations
    finalSql += '-- Locations\n';
    finalSql += await exportTableData(pool, 'locations', [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'branch_id', type: 'number' },
      { name: 'status', type: 'number' },
      { name: 'created_at', type: 'date' },
      { name: 'updated_at', type: 'date' }
    ]);

    // 3. Departments
    finalSql += '-- Departments\n';
    finalSql += await exportTableData(pool, 'departments', [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'branch_id', type: 'number' },
      { name: 'location_id', type: 'number' },
      { name: 'status', type: 'number' },
      { name: 'created_at', type: 'date' },
      { name: 'updated_at', type: 'date' }
    ]);

    // 4. Branch Designations
    finalSql += '-- Branch Designations\n';
    try {
      finalSql += await exportTableData(pool, 'branch_designations', [
        { name: 'id', type: 'number' },
        { name: 'branch_id', type: 'number' },
        { name: 'designation', type: 'string' },
        { name: 'sort_order', type: 'number' }
      ]);
    } catch (e) {
      console.log('Skipping branch_designations (table might not exist)');
    }

    // 5. Department Designations
    finalSql += '-- Department Designations\n';
    try {
      finalSql += await exportTableData(pool, 'department_designations', [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'department_id', type: 'number' },
        { name: 'status', type: 'number' },
        { name: 'created_at', type: 'date' },
        { name: 'updated_at', type: 'date' }
      ]);
    } catch (e) {
      console.log('Skipping department_designations (table might not exist)');
    }

    const migrationPath = path.join(__dirname, 'migrations', '021_seed_core_hierarchy.sql');
    fs.writeFileSync(migrationPath, finalSql);
    console.log(`✅ Seed script generated successfully at: ${migrationPath}`);
  } catch (err) {
    console.error('Error generating seed script:', err);
  } finally {
    pool.end();
  }
}

main();
