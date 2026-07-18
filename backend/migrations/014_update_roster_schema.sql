USE digital_signage;

SET FOREIGN_KEY_CHECKS = 0;

-- Add branch and location to roster to support doctors sitting in multiple branches
ALTER TABLE roster ADD COLUMN branch_id INT AFTER doctor_id;
ALTER TABLE roster ADD COLUMN location_id INT AFTER branch_id;

-- Seed existing roster data with the doctor's default branch/location
UPDATE roster r
JOIN doctors d ON r.doctor_id = d.id
SET r.branch_id = d.branch_id, r.location_id = d.location_id
WHERE r.branch_id IS NULL;

-- Make them NOT NULL after seeding
ALTER TABLE roster MODIFY COLUMN branch_id INT NOT NULL;
ALTER TABLE roster MODIFY COLUMN location_id INT NOT NULL;

-- Add foreign keys
ALTER TABLE roster ADD CONSTRAINT fk_roster_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE roster ADD CONSTRAINT fk_roster_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;

-- Update the unique constraint to include branch and location
ALTER TABLE roster DROP INDEX unique_roster_entry;
ALTER TABLE roster ADD UNIQUE KEY unique_roster_entry (date, doctor_id, branch_id, location_id, timing);

SET FOREIGN_KEY_CHECKS = 1;
