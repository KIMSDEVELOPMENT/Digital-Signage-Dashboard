-- Migration to sync internal tables

-- Table structure for branch_designations
CREATE TABLE IF NOT EXISTS `branch_designations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `designation` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_branch_designation` (`branch_id`,`designation`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `branch_designations_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_designations' AND INDEX_NAME = 'uniq_branch_designation'
);
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE branch_designations ADD UNIQUE KEY uniq_branch_designation (branch_id, designation)', 'SELECT "index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Table structure for department_designations
CREATE TABLE IF NOT EXISTS `department_designations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int NOT NULL,
  `designation` varchar(100) NOT NULL,
  `sort_order` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dept_desig` (`department_id`,`designation`),
  CONSTRAINT `department_designations_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for doctor_branch_location
CREATE TABLE IF NOT EXISTS `doctor_branch_location` (
  `doctor_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `location_id` int NOT NULL,
  PRIMARY KEY (`doctor_id`,`branch_id`,`location_id`),
  KEY `fk_dbl_branch` (`branch_id`),
  KEY `fk_dbl_location` (`location_id`),
  CONSTRAINT `fk_dbl_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dbl_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dbl_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for doctor_departments
CREATE TABLE IF NOT EXISTS `doctor_departments` (
  `doctor_id` int NOT NULL,
  `department_id` int NOT NULL,
  PRIMARY KEY (`doctor_id`,`department_id`),
  KEY `fk_dd_department` (`department_id`),
  CONSTRAINT `fk_dd_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dd_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for doctor_sittings
CREATE TABLE IF NOT EXISTS `doctor_sittings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `branch_id` int NOT NULL,
  `location_id` int NOT NULL,
  `display_days` json NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_doctor_sitting` (`employee_id`,`branch_id`,`location_id`),
  KEY `branch_id` (`branch_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `doctor_sittings_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `doctors` (`employee_id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_sittings_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_sittings_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `doctor_sittings_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `branch_id` int NOT NULL,
  `location_id` int NOT NULL,
  `display_days` json NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_doctor_sitting` (`employee_id`,`branch_id`,`location_id`),
  KEY `branch_id` (`branch_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `doctor_sittings_new_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `doctors` (`employee_id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_sittings_new_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_sittings_new_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `doctor_sittings_new` (`employee_id`, `branch_id`, `location_id`, `display_days`)
SELECT ds.`employee_id`, da.`branch_id`, da.`location_id`, ds.`display_days`
FROM `doctor_sittings` ds
JOIN `doctors` d ON d.`employee_id` = ds.`employee_id`
JOIN `doctor_assignments` da ON da.`doctor_id` = d.`id`;

DROP TABLE IF EXISTS `doctor_sittings`;
RENAME TABLE `doctor_sittings_new` TO `doctor_sittings`;

-- Table structure for videos
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `branch_id` int NOT NULL,
  `location_id` int NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `duration` float NOT NULL,
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `play_order` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `branch_id_idx` (`branch_id`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `videos_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `videos_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

