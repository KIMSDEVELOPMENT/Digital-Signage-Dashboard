USE digital_signage;

-- Migration 022: Create roster_archives table
-- This table was referenced in rosterController.js but was never created via migration.
-- It stores metadata about uploaded Excel roster spreadsheets for the "Files Archive" feature.

CREATE TABLE IF NOT EXISTS roster_archives (
  id                INT           NOT NULL AUTO_INCREMENT,
  original_filename VARCHAR(255)  NOT NULL,
  stored_filepath   VARCHAR(500)  NOT NULL,
  branch_id         INT           NOT NULL,
  uploaded_by       INT           DEFAULT NULL,
  uploaded_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ra_branch   FOREIGN KEY (branch_id)  REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
