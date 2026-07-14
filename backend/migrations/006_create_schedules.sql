-- Version 006: Create roster (schedules) table

USE digital_signage;

CREATE TABLE IF NOT EXISTS roster (
  id            INT          NOT NULL AUTO_INCREMENT,
  date          DATE         NOT NULL,
  employee_id   VARCHAR(50)  NOT NULL,
  timing        VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_roster_entry (date, employee_id),
  CONSTRAINT roster_ibfk_1 FOREIGN KEY (employee_id) REFERENCES doctors (employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
