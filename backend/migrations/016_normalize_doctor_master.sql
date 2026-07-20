USE digital_signage;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create doctor_assignments table
CREATE TABLE IF NOT EXISTS doctor_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  doctor_id INT NOT NULL,
  branch_id INT NOT NULL,
  location_id INT NOT NULL,
  department_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_doctor_assignment (doctor_id, branch_id, location_id, department_id),
  CONSTRAINT fk_assign_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Populate doctor_assignments from existing doctors
INSERT IGNORE INTO doctor_assignments (doctor_id, branch_id, location_id, department_id)
SELECT id, branch_id, location_id, department_id FROM doctors;

-- 3. Consolidate doctors to unique employee_ids
CREATE TEMPORARY TABLE doc_mapping AS
SELECT d.id AS old_id, (SELECT MIN(id) FROM doctors d2 WHERE d2.employee_id = d.employee_id) AS new_id
FROM doctors d;

UPDATE doctor_assignments da
JOIN doc_mapping dm ON da.doctor_id = dm.old_id
SET da.doctor_id = dm.new_id;

UPDATE roster r
JOIN doc_mapping dm ON r.doctor_id = dm.old_id
SET r.doctor_id = dm.new_id;

-- 4. Delete the duplicate doctors
DELETE FROM doctors WHERE id NOT IN (SELECT new_id FROM doc_mapping);

-- 5. Modify doctors schema
ALTER TABLE doctors DROP FOREIGN KEY fk_doctors_branch;
ALTER TABLE doctors DROP FOREIGN KEY fk_doctors_location;
ALTER TABLE doctors DROP FOREIGN KEY fk_doctors_department;

ALTER TABLE doctors DROP INDEX uniq_branch_employee;
ALTER TABLE doctors DROP INDEX department_id;
ALTER TABLE doctors DROP INDEX location_id;

ALTER TABLE doctors ADD UNIQUE KEY uniq_employee_id (employee_id);

ALTER TABLE doctors DROP COLUMN branch_id;
ALTER TABLE doctors DROP COLUMN location_id;
ALTER TABLE doctors DROP COLUMN department_id;

SET FOREIGN_KEY_CHECKS = 1;
