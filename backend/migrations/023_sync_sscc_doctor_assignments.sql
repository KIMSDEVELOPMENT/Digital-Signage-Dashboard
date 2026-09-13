-- Migration 023: Sync Doctor Assignments to Exact Active Departments
-- Fixes foreign key department_id mismatches where doctors were assigned under cross-location or renumbered departments.

-- 1. Align doctor_assignments where department_id points to a department with matching branch, location, and name
UPDATE doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
JOIN departments old_dept ON da.department_id = old_dept.id
JOIN departments target_dept ON target_dept.branch_id = da.branch_id 
                            AND target_dept.location_id = da.location_id 
                            AND TRIM(UPPER(target_dept.name)) = TRIM(UPPER(old_dept.name))
                            AND target_dept.status = 1
SET da.department_id = target_dept.id
WHERE da.department_id != target_dept.id;

-- 2. Align doctor_assignments where department_id is for another branch/location but target department exists under doctor's assigned branch
UPDATE doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
JOIN departments old_dept ON da.department_id = old_dept.id
JOIN departments target_dept ON target_dept.branch_id = da.branch_id 
                            AND TRIM(UPPER(target_dept.name)) = TRIM(UPPER(old_dept.name))
                            AND target_dept.status = 1
SET da.department_id = target_dept.id,
    da.location_id = target_dept.location_id
WHERE old_dept.branch_id != da.branch_id;

-- 3. Verify no orphaned department_id exists
SELECT da.id, da.doctor_id, d.name AS doctor_name, da.branch_id, da.location_id, da.department_id, dept.name AS dept_name
FROM doctor_assignments da
JOIN doctors d ON da.doctor_id = d.id
LEFT JOIN departments dept ON da.department_id = dept.id
WHERE dept.id IS NULL;
