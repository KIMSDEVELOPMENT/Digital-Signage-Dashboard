USE digital_signage;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Define which physical TV screen gets which playlist
CREATE TABLE IF NOT EXISTS display_playlists (
  id INT NOT NULL AUTO_INCREMENT,
  screen_branch_id INT NOT NULL,
  screen_location_id INT NOT NULL,
  UNIQUE KEY uniq_screen (screen_branch_id, screen_location_id),
  PRIMARY KEY (id),
  CONSTRAINT fk_playlist_branch FOREIGN KEY (screen_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_playlist_loc FOREIGN KEY (screen_location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. The individual steps (phases) in a TV's playlist loop
CREATE TABLE IF NOT EXISTS display_playlist_steps (
  id INT NOT NULL AUTO_INCREMENT,
  playlist_id INT NOT NULL,
  step_order INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 10,
  PRIMARY KEY (id),
  CONSTRAINT fk_step_playlist FOREIGN KEY (playlist_id) REFERENCES display_playlists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Which blocks (locations) to fetch doctors from during this step
CREATE TABLE IF NOT EXISTS display_playlist_step_locations (
  step_id INT NOT NULL,
  location_id INT NOT NULL,
  PRIMARY KEY (step_id, location_id),
  CONSTRAINT fk_sl_step FOREIGN KEY (step_id) REFERENCES display_playlist_steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_sl_loc FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Departments to hide during this step (e.g., exclude Emergency Medicine)
CREATE TABLE IF NOT EXISTS display_playlist_step_exclude_departments (
  step_id INT NOT NULL,
  department_id INT NOT NULL,
  PRIMARY KEY (step_id, department_id),
  CONSTRAINT fk_se_step FOREIGN KEY (step_id) REFERENCES display_playlist_steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_se_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
