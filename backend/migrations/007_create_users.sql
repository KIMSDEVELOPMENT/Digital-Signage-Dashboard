-- Version 007: Create user assignment and permissions tables

USE digital_signage;

-- User Branches
CREATE TABLE IF NOT EXISTS user_branches (
  id        INT         NOT NULL AUTO_INCREMENT,
  user_id   INT         NOT NULL,
  branch    VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_branch (user_id, branch),
  CONSTRAINT user_branches_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- User Locations
CREATE TABLE IF NOT EXISTS user_locations (
  id        INT          NOT NULL AUTO_INCREMENT,
  user_id   INT          NOT NULL,
  branch    VARCHAR(50)  NOT NULL,
  location  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_location (user_id, branch, location),
  CONSTRAINT user_locations_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- User Departments
CREATE TABLE IF NOT EXISTS user_departments (
  id              INT NOT NULL AUTO_INCREMENT,
  user_id         INT NOT NULL,
  department_id   INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_dept (user_id, department_id),
  CONSTRAINT user_departments_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_departments_ibfk_2 FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id            INT         NOT NULL AUTO_INCREMENT,
  user_id       INT         NOT NULL,
  module_name   VARCHAR(50) NOT NULL,
  can_read      TINYINT(1)  DEFAULT 0,
  can_create    TINYINT(1)  DEFAULT 0,
  can_update    TINYINT(1)  DEFAULT 0,
  can_delete    TINYINT(1)  DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_module (user_id, module_name),
  CONSTRAINT user_permissions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
