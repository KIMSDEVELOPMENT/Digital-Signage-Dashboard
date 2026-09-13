-- Migration 023: Sync Doctor Assignments, Display Order, and Department Designations
USE digital_signage;

-- 1. Ensure display_order column exists in doctor_assignments
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'doctor_assignments' 
  AND COLUMN_NAME = 'display_order';

SET @stmt = IF(@col_exists = 0, 
  'ALTER TABLE doctor_assignments ADD COLUMN display_order INT DEFAULT 0 AFTER shift_time', 
  'SELECT "display_order column already exists"');
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure department_designations table exists
CREATE TABLE IF NOT EXISTS department_designations (
  id INT NOT NULL AUTO_INCREMENT,
  department_id INT NOT NULL,
  designation VARCHAR(150) NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY department_id (department_id),
  CONSTRAINT fk_dd_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Align doctor_assignments where department_id points to a department with matching branch, location, and name
UPDATE doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
JOIN departments old_dept ON da.department_id = old_dept.id
JOIN departments target_dept ON target_dept.branch_id = da.branch_id 
                            AND target_dept.location_id = da.location_id 
                            AND TRIM(UPPER(target_dept.name)) = TRIM(UPPER(old_dept.name))
                            AND target_dept.status = 1
SET da.department_id = target_dept.id
WHERE da.department_id != target_dept.id;

-- 4. Align doctor_assignments where department_id is for another branch/location but target department exists under doctor's assigned branch
UPDATE doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
JOIN departments old_dept ON da.department_id = old_dept.id
JOIN departments target_dept ON target_dept.branch_id = da.branch_id 
                            AND TRIM(UPPER(target_dept.name)) = TRIM(UPPER(old_dept.name))
                            AND target_dept.status = 1
SET da.department_id = target_dept.id,
    da.location_id = target_dept.location_id
WHERE old_dept.branch_id != da.branch_id;

-- 5. Verify no orphaned department_id exists
SELECT da.id, da.doctor_id, d.name AS doctor_name, da.branch_id, da.location_id, da.department_id, dept.name AS dept_name
FROM doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
LEFT JOIN departments dept ON da.department_id = dept.id
WHERE dept.id IS NULL;
