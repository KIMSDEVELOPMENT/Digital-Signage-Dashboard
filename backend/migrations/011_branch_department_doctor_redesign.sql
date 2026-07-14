-- Version 011: Normalization redesign for Branch, Location, Department, and Doctor masters.
-- Introduces dynamic branches and locations tables, re-keys relationships, and enforces
-- organizational uniqueness checks.

USE digital_signage;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  status TINYINT(1) DEFAULT 1, -- 1 = active, 0 = inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed branches from existing unique branch strings
INSERT IGNORE INTO branches (name)
SELECT DISTINCT branch FROM branches_locations;

-- Add KIMS branches if not present
INSERT IGNORE INTO branches (name) VALUES ('KIMS Bhubaneswar');
INSERT IGNORE INTO branches (name) VALUES ('KIMS Balasore');
INSERT IGNORE INTO branches (name) VALUES ('KIMS Cuttack');
INSERT IGNORE INTO branches (name) VALUES ('KIMS Berhampur');

-- 2. Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id INT NOT NULL AUTO_INCREMENT,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_branch_location (branch_id, name),
  CONSTRAINT fk_locations_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed locations from existing branches_locations table mapping to branches
INSERT IGNORE INTO locations (branch_id, name)
SELECT b.id, bl.location
FROM branches_locations bl
JOIN branches b ON bl.branch = b.name;

-- 3. Redesign departments table to have Branch + Location association
CREATE TABLE IF NOT EXISTS departments_new (
  id INT NOT NULL AUTO_INCREMENT,
  branch_id INT NOT NULL,
  location_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_branch_location_dept (branch_id, location_id, name),
  CONSTRAINT fk_departments_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
  CONSTRAINT fk_departments_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrate existing departments that have doctors
INSERT IGNORE INTO departments_new (branch_id, location_id, name)
SELECT DISTINCT b.id, l.id, d.name
FROM doctors doc
JOIN departments d ON doc.department_id = d.id
JOIN branches b ON doc.branch = b.name
JOIN locations l ON (doc.location = l.name AND l.branch_id = b.id);

-- Migrate other departments not linked to doctors to default branch & location
INSERT IGNORE INTO departments_new (branch_id, location_id, name)
SELECT DISTINCT (SELECT id FROM branches LIMIT 1), (SELECT id FROM locations LIMIT 1), d.name
FROM departments d
WHERE d.id NOT IN (SELECT DISTINCT department_id FROM doctors);

-- 4. Redesign doctors table to refer to IDs of branch, location, and redesigned department
CREATE TABLE IF NOT EXISTS doctors_new (
  id              INT          NOT NULL AUTO_INCREMENT,
  employee_id     VARCHAR(50)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  designation     VARCHAR(100) NOT NULL,
  department_id   INT          NOT NULL,
  branch_id       INT          NOT NULL,
  location_id     INT          NOT NULL,
  photo_url       VARCHAR(255) NOT NULL,
  status          TINYINT(1)   DEFAULT 1,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_branch_employee (branch_id, employee_id),
  KEY department_id (department_id),
  KEY location_id (location_id),
  CONSTRAINT fk_doctors_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
  CONSTRAINT fk_doctors_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT fk_doctors_department FOREIGN KEY (department_id) REFERENCES departments_new (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrate doctors data mapping original string values to normalized IDs
INSERT IGNORE INTO doctors_new (id, employee_id, name, designation, department_id, branch_id, location_id, photo_url, created_at)
SELECT doc.id, doc.employee_id, doc.name, doc.designation, dn.id, b.id, l.id, doc.photo_url, doc.created_at
FROM doctors doc
JOIN departments d ON doc.department_id = d.id
JOIN branches b ON doc.branch = b.name
JOIN locations l ON (doc.location = l.name AND l.branch_id = b.id)
JOIN departments_new dn ON (dn.name = d.name AND dn.branch_id = b.id AND dn.location_id = l.id);

-- Drop old constraints and tables
DROP TABLE IF EXISTS roster;
DROP TABLE IF EXISTS user_departments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS departments;

-- Rename tables to the final schema names
RENAME TABLE departments_new TO departments;
RENAME TABLE doctors_new TO doctors;

-- 5. Recreate dependent scheduling and user-department permission tables
CREATE TABLE IF NOT EXISTS roster (
  id            INT          NOT NULL AUTO_INCREMENT,
  date          DATE         NOT NULL,
  doctor_id     INT          NOT NULL,
  timing        VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_roster_entry (date, doctor_id),
  CONSTRAINT roster_ibfk_1 FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS user_departments (
  id              INT NOT NULL AUTO_INCREMENT,
  user_id         INT NOT NULL,
  department_id   INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_dept (user_id, department_id),
  CONSTRAINT user_departments_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_departments_ibfk_2 FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Redesign user branch and location permissions using IDs
CREATE TABLE IF NOT EXISTS user_branches_new (
  id        INT NOT NULL AUTO_INCREMENT,
  user_id   INT NOT NULL,
  branch_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_branch (user_id, branch_id),
  CONSTRAINT fk_user_branches_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_branches_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO user_branches_new (user_id, branch_id)
SELECT ub.user_id, b.id
FROM user_branches ub
JOIN branches b ON ub.branch = b.name;

DROP TABLE IF EXISTS user_branches;
RENAME TABLE user_branches_new TO user_branches;

CREATE TABLE IF NOT EXISTS user_locations_new (
  id          INT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  location_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_location (user_id, location_id),
  CONSTRAINT fk_user_locations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_locations_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO user_locations_new (user_id, location_id)
SELECT ul.user_id, l.id
FROM user_locations ul
JOIN branches b ON ul.branch = b.name
JOIN locations l ON (ul.location = l.name AND l.branch_id = b.id);

DROP TABLE IF EXISTS user_locations;
RENAME TABLE user_locations_new TO user_locations;

-- Cleanup legacy tables
DROP TABLE IF EXISTS branches_locations;

SET FOREIGN_KEY_CHECKS = 1;
