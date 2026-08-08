import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportSchemas() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_signage'
  });
  
  const tables = [
    'branch_designations',
    'department_designations',
    'doctor_branch_location',
    'doctor_departments',
    'doctor_sittings',
    'videos'
  ];
  
  let outputSql = '-- Migration to sync internal tables\n\n';
  
  try {
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`SHOW CREATE TABLE ${table}`);
        if (rows.length > 0) {
          let createStmt = rows[0]['Create Table'];
          // Add IF NOT EXISTS
          createStmt = createStmt.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS');
          outputSql += `-- Table structure for ${table}\n`;
          outputSql += createStmt + ';\n\n';
        }
      } catch (e) {
        console.warn(`Table ${table} might not exist or threw an error:`, e.message);
      }
    }
    
    const outputPath = path.join(__dirname, 'migrations', '020_sync_internal_tables.sql');
    fs.writeFileSync(outputPath, outputSql);
    console.log(`Successfully wrote migration to ${outputPath}`);
    
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

exportSchemas();
