-- Version 008: Add photo_url column to doctors table

USE digital_signage;

ALTER TABLE doctors ADD COLUMN photo_url VARCHAR(255) NOT NULL;
