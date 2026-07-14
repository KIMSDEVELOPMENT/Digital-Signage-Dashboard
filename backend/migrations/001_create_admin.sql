-- Version 001: Create database and users (admin) table, and seed Super Admin

CREATE DATABASE IF NOT EXISTS digital_signage
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE digital_signage;

CREATE TABLE IF NOT EXISTS users (
  id            INT           NOT NULL AUTO_INCREMENT,
  employee_id   VARCHAR(50)   DEFAULT NULL,
  full_name     VARCHAR(100)  NOT NULL DEFAULT 'System Admin',
  username      VARCHAR(50)   NOT NULL,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('super_admin', 'normal_admin') NOT NULL,
  branch        ENUM('PBMH', 'SSCC', 'Dental') DEFAULT NULL,
  location      ENUM('A Block', 'B/C Block', 'KSS', 'KCC', 'Dental') DEFAULT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Default Super Admin (password: Admin@123)
INSERT IGNORE INTO users (id, username, password, role, full_name)
VALUES (1, 'Admin', '$2b$10$AvKt4enGMrEmgHMIM/8N7.joTYGdsq2BhSW0xHwCz1WcbasVUX1yy', 'super_admin', 'System Admin');
