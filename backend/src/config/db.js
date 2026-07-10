import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

let pool;

export async function initializeDatabase() {
  try {
    // Connect to MySQL server without database first to ensure DB exists
    const connection = await mysql.createConnection({
      host: DB_HOST || 'localhost',
      user: DB_USER || 'root',
      password: DB_PASSWORD || 'Sidh@54321',
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME || 'digital_signage'}\`;`);
    await connection.end();

    // Create the pool with the database specified
    pool = mysql.createPool({
      host: DB_HOST || 'localhost',
      user: DB_USER || 'root',
      password: DB_PASSWORD || 'Sidh@54321',
      database: DB_NAME || 'digital_signage',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('Database connection pool established.');

    // Initialize tables
    await createTables();
    
    // Seed super admin
    await seedSuperAdmin();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

async function createTables() {
  const departmentsTable = `
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `;

  const doctorsTable = `
    CREATE TABLE IF NOT EXISTS doctors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      department_id INT NOT NULL,
      branch VARCHAR(50) NOT NULL,
      location VARCHAR(100) NOT NULL,
      photo_url VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB;
  `;

  // Users table with new fields for granular RBAC
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NULL,
      full_name VARCHAR(100) NOT NULL DEFAULT 'System Admin',
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('super_admin', 'normal_admin') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `;

  const rosterTable = `
    CREATE TABLE IF NOT EXISTS roster (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      timing VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_roster_entry (date, employee_id),
      FOREIGN KEY (employee_id) REFERENCES doctors(employee_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  // Assigned branches for each normal admin
  const userBranchesTable = `
    CREATE TABLE IF NOT EXISTS user_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      branch VARCHAR(50) NOT NULL,
      UNIQUE KEY unique_user_branch (user_id, branch),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  // Assigned locations per branch for each normal admin
  const userLocationsTable = `
    CREATE TABLE IF NOT EXISTS user_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      branch VARCHAR(50) NOT NULL,
      location VARCHAR(100) NOT NULL,
      UNIQUE KEY unique_user_location (user_id, branch, location),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  // Assigned departments for each normal admin
  const userDepartmentsTable = `
    CREATE TABLE IF NOT EXISTS user_departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      department_id INT NOT NULL,
      UNIQUE KEY unique_user_dept (user_id, department_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  // Module-level CRUD permissions for each normal admin
  const userPermissionsTable = `
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      module_name VARCHAR(50) NOT NULL,
      can_read TINYINT(1) DEFAULT 0,
      can_create TINYINT(1) DEFAULT 0,
      can_update TINYINT(1) DEFAULT 0,
      can_delete TINYINT(1) DEFAULT 0,
      UNIQUE KEY unique_user_module (user_id, module_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  await pool.query(departmentsTable);
  await pool.query(doctorsTable);
  await pool.query(usersTable);
  await pool.query(rosterTable);
  await pool.query(userBranchesTable);
  await pool.query(userLocationsTable);
  await pool.query(userDepartmentsTable);
  await pool.query(userPermissionsTable);

  // Run migrations for existing installations
  await runMigrations();

  console.log('Database tables verified/created successfully.');
}

async function runMigrations() {
  try {
    // Add employee_id column to users if not exists
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE NULL,
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) NOT NULL DEFAULT 'System Admin'
    `).catch(() => {}); // Ignore if columns already exist

    // Migrate branch/location columns from old ENUM to VARCHAR for scalability
    // This handles cases where old schema had ENUM constraints
    await pool.query(`
      ALTER TABLE doctors 
      MODIFY COLUMN branch VARCHAR(50) NOT NULL,
      MODIFY COLUMN location VARCHAR(100) NOT NULL
    `).catch(() => {});

  } catch (err) {
    // Migrations are best-effort; ignore errors in dev
    console.log('Migration note:', err.message);
  }
}

async function seedSuperAdmin() {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE role = "super_admin" LIMIT 1');
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin123', 10);
      await pool.query(
        'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)',
        ['Admin', hashedPassword, 'super_admin', 'Super Administrator']
      );
      console.log('Default Super Admin seeded successfully: Username "Admin", Password "Admin123"');
    } else {
      // Update existing super admin to have full_name if missing
      await pool.query(
        'UPDATE users SET full_name = ? WHERE role = "super_admin" AND (full_name IS NULL OR full_name = "")',
        ['Super Administrator']
      );
      console.log('Super Admin already exists.');
    }
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  return pool;
}
