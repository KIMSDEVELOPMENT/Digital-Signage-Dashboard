-- Version 010: Add branch column to departments table

USE digital_signage;

ALTER TABLE departments ADD COLUMN branch VARCHAR(50) DEFAULT NULL;
