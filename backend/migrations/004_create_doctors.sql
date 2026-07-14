-- Version 004: Create doctors table (without photo_url)

USE digital_signage;

CREATE TABLE IF NOT EXISTS doctors (
  id              INT          NOT NULL AUTO_INCREMENT,
  employee_id     VARCHAR(50)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  designation     VARCHAR(100) NOT NULL,
  department_id   INT          NOT NULL,
  branch          VARCHAR(50)  NOT NULL,
  location        VARCHAR(100) NOT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY employee_id (employee_id),
  CONSTRAINT doctors_ibfk_1 FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
