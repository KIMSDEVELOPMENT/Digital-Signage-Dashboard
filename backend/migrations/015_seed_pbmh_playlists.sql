USE digital_signage;

SET @branch_name = 'PBMH';
SET @pbmh_id = (SELECT id FROM branches WHERE name = @branch_name LIMIT 1);

-- Fix B/C Block slug to match frontend sanitization
UPDATE locations SET slug = 'b-c-block' WHERE name = 'B/C Block' AND branch_id = @pbmh_id;

SET @loc_a_id = (SELECT id FROM locations WHERE branch_id = @pbmh_id AND name = 'A Block' LIMIT 1);
SET @loc_bc_id = (SELECT id FROM locations WHERE branch_id = @pbmh_id AND name = 'B/C Block' LIMIT 1);

-- Create Playlists for A Block TV and B/C Block TV
INSERT IGNORE INTO display_playlists (screen_branch_id, screen_location_id) VALUES (@pbmh_id, @loc_a_id);
INSERT IGNORE INTO display_playlists (screen_branch_id, screen_location_id) VALUES (@pbmh_id, @loc_bc_id);

SET @playlist_a_id = (SELECT id FROM display_playlists WHERE screen_branch_id = @pbmh_id AND screen_location_id = @loc_a_id LIMIT 1);
SET @playlist_bc_id = (SELECT id FROM display_playlists WHERE screen_branch_id = @pbmh_id AND screen_location_id = @loc_bc_id LIMIT 1);

-- Delete existing steps if re-running
DELETE FROM display_playlist_steps WHERE playlist_id IN (@playlist_a_id, @playlist_bc_id);

-- Create Step for A Block TV
INSERT INTO display_playlist_steps (playlist_id, step_order, title, duration_seconds) 
VALUES (@playlist_a_id, 1, 'A Block', 10);
SET @step_a_id = LAST_INSERT_ID();

INSERT INTO display_playlist_step_locations (step_id, location_id) VALUES (@step_a_id, @loc_a_id);

-- Create Step for B/C Block TV
INSERT INTO display_playlist_steps (playlist_id, step_order, title, duration_seconds) 
VALUES (@playlist_bc_id, 1, 'B/C Block', 10);
SET @step_bc_id = LAST_INSERT_ID();

INSERT INTO display_playlist_step_locations (step_id, location_id) VALUES (@step_bc_id, @loc_bc_id);

-- Add exclusion for Emergency Medicine on B/C Block TV
INSERT IGNORE INTO departments (branch_id, location_id, name) VALUES (@pbmh_id, @loc_bc_id, 'Emergency Medicine');
SET @em_dept_id = (SELECT id FROM departments WHERE name = 'Emergency Medicine' AND branch_id = @pbmh_id AND location_id = @loc_bc_id LIMIT 1);

-- Also check if it exists generally in PBMH (as departments might be linked differently)
-- Actually, let's just insert into the exclude table if we found it
INSERT IGNORE INTO display_playlist_step_exclude_departments (step_id, department_id)
SELECT @step_bc_id, id FROM departments WHERE name = 'Emergency Medicine' AND (branch_id = @pbmh_id OR branch_id IS NULL);
