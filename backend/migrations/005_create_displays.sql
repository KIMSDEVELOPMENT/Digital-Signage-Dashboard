-- Version 005: Create displays table

USE digital_signage;

CREATE TABLE IF NOT EXISTS displays (
  id      INT          NOT NULL AUTO_INCREMENT,
  name    VARCHAR(100) NOT NULL,
  branch  VARCHAR(50)  NOT NULL,
  location VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
