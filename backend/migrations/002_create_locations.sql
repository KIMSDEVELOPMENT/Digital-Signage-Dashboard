-- Version 002: Create branches_locations table and seed default locations

USE digital_signage;

CREATE TABLE IF NOT EXISTS branches_locations (
  id        INT          NOT NULL AUTO_INCREMENT,
  branch    VARCHAR(100) NOT NULL,
  location  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_branch_location (branch, location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Default Branch-Location pairs
INSERT IGNORE INTO branches_locations (branch, location) VALUES ('PBMH', 'A Block');
INSERT IGNORE INTO branches_locations (branch, location) VALUES ('PBMH', 'B/C Block');
INSERT IGNORE INTO branches_locations (branch, location) VALUES ('SSCC', 'KSS');
INSERT IGNORE INTO branches_locations (branch, location) VALUES ('SSCC', 'KCC');
INSERT IGNORE INTO branches_locations (branch, location) VALUES ('Dental', 'Dental');
