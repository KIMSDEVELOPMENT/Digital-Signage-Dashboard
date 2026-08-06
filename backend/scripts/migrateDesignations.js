import { initializePool, getPool } from '../config/db.js';

const defaultSSCCDesignations = [
  'SENIOR CONSULTANT',
  'CONSULTANT',
  'ASSOCIATE PROFESSOR',
  'PROFESSOR',
  'VISITING CONSULTANT',
  'EMERITUS PROFESSOR',
  'ASSISTANT PROFESSOR',
  'SENIOR RESIDENT'
];

async function migrate() {
  try {
    await initializePool();
    const pool = getPool();

    console.log('Creating department_designations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS department_designations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        designation VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL,
        UNIQUE KEY dept_desig (department_id, designation),
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    console.log('Fetching all SSCC departments...');
    // Assuming branch 'SSCC' exists, we get its ID first
    const [branches] = await pool.query(`SELECT id FROM branches WHERE UPPER(name) = 'SSCC'`);
    if (branches.length > 0) {
      const ssccBranchId = branches[0].id;
      const [departments] = await pool.query(`SELECT id FROM departments WHERE branch_id = ?`, [ssccBranchId]);
      
      console.log(`Found ${departments.length} SSCC departments.`);
      
      for (const dept of departments) {
        for (let i = 0; i < defaultSSCCDesignations.length; i++) {
          const designation = defaultSSCCDesignations[i];
          const sortOrder = i + 1;
          await pool.query(
            `INSERT IGNORE INTO department_designations (department_id, designation, sort_order) VALUES (?, ?, ?)`,
            [dept.id, designation, sortOrder]
          );
        }
      }
      console.log('Successfully seeded SSCC departments with default designations.');
    } else {
      console.log('Branch SSCC not found. Skipping seeding.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
