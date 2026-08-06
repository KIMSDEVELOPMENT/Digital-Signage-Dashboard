USE digital_signage;

-- Add shift_time to doctor_assignments table
ALTER TABLE doctor_assignments 
ADD COLUMN shift_time VARCHAR(100) DEFAULT NULL AFTER department_id;
