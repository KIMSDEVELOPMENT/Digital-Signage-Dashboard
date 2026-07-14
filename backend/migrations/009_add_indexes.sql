-- Version 009: Add query optimization indexes

USE digital_signage;

-- Index for doctors department lookup
ALTER TABLE doctors ADD INDEX department_id (department_id);

-- Index for roster employee scheduling lookup
ALTER TABLE roster ADD INDEX employee_id (employee_id);

-- Index for user departments configuration mapping lookup
ALTER TABLE user_departments ADD INDEX department_id (department_id);
