USE digital_signage;

SET FOREIGN_KEY_CHECKS = 0;

-- Adds slugs to existing branches and locations for URL routing
ALTER TABLE branches ADD COLUMN slug VARCHAR(100) UNIQUE AFTER name;
ALTER TABLE locations ADD COLUMN slug VARCHAR(100) AFTER name;

-- Seed initial slugs based on names
UPDATE branches SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
UPDATE locations SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- Make slugs not null after seeding
ALTER TABLE branches MODIFY COLUMN slug VARCHAR(100) NOT NULL;
ALTER TABLE locations MODIFY COLUMN slug VARCHAR(100) NOT NULL;

-- Ensure branch_id + slug is unique for locations
ALTER TABLE locations ADD UNIQUE KEY uniq_branch_location_slug (branch_id, slug);

SET FOREIGN_KEY_CHECKS = 1;
