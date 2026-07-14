import xlsx from 'xlsx';
import fs from 'fs';
import doctorRepository from '../repositories/DoctorRepository.js';
import rosterRepository from '../repositories/RosterRepository.js';
import userRepository from '../repositories/UserRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import { getPool } from '../config/db.js';

// Resolve url parameters case-insensitively and ignoring non-alphanumeric chars
async function resolveLocation(branch, locParam) {
  if (!locParam) return null;
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT l.name AS location 
    FROM locations l
    JOIN branches b ON l.branch_id = b.id
    WHERE LOWER(b.name) = LOWER(?)
  `, [branch]);
  const normParam = locParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const row of rows) {
    const normDb = row.location.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normDb === normParam) {
      return row.location;
    }
  }
  return locParam; // Fallback
}

export async function downloadTemplate(req, res) {
  const { branch } = req.query;
  if (!branch) {
    return res.status(400).json({ message: 'Branch parameter is required.' });
  }

  try {
    // Task 1: The Excel file should contain ONLY the column headers
    const wsSchedule = xlsx.utils.json_to_sheet([], {
      header: ['Date', 'Site Name', 'Block Name', 'Department Name', 'Doctor Name', 'Timing']
    });

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, wsSchedule, 'Doctor Schedule');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=Roster_Template_${branch}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);

  } catch (error) {
    console.error('Error generating template:', error);
    return res.status(500).json({ message: 'Internal server error generating template.' });
  }
}

export async function previewRoster(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const { branch } = req.query;
  if (!branch) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Branch parameter is required.' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Phase 1: Structural verification
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r: range.s.r, c: c })];
      headers.push(cell ? String(cell.v).trim() : '');
    }

    const expectedHeaders = ['Date', 'Site Name', 'Block Name', 'Department Name', 'Doctor Name', 'Timing'];
    let isHeaderValid = true;
    if (headers.length < 6) {
      isHeaderValid = false;
    } else {
      for (let i = 0; i < 6; i++) {
        if (headers[i] !== expectedHeaders[i]) {
          isHeaderValid = false;
          break;
        }
      }
    }

    if (!isHeaderValid) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: 'Invalid Excel Template. Please download the official Hospital Template and upload again.' 
      });
    }

    const data = xlsx.utils.sheet_to_json(sheet);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty.' });
    }

    const pool = getPool();
    // Fetch valid branch/locations configuration from normalized tables
    const [configRows] = await pool.query(`
      SELECT b.name AS branch, l.name AS location 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE b.status = 1 AND l.status = 1
    `);
    const validBranchLocations = {};
    const validBranches = new Set();
    configRows.forEach(row => {
      const b = row.branch.toLowerCase();
      validBranches.add(b);
      if (!validBranchLocations[b]) {
        validBranchLocations[b] = new Set();
      }
      validBranchLocations[b].add(row.location.toLowerCase());
    });

    const branchLower = branch.toLowerCase();
    if (!validBranches.has(branchLower)) {
      return res.status(400).json({ message: `Branch '${branch}' is not configured or inactive in the database.` });
    }

    // Verify permission for this branch
    if (req.user.role === 'normal_admin') {
      const allowedBranches = await userRepository.getUserBranches(req.user.id);
      const allowedBranchesLower = allowedBranches.map(b => b.toLowerCase());
      if (!allowedBranchesLower.includes(branchLower)) {
        return res.status(403).json({ message: `You do not have permission to import rosters for branch ${branch}.` });
      }
    }

    // Fetch departments for this branch
    const departments = await departmentRepository.findAll(branch);
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept.name.toLowerCase()] = dept.id;
    });

    // Fetch all active doctors for this branch
    const doctorsList = await doctorRepository.findWithFilters({ branches: [branch], status: 1 });
    const doctorLookup = {};
    doctorsList.forEach(doc => {
      const nameKey = doc.name.trim().toLowerCase();
      const deptId = doc.department_id;
      doctorLookup[`${nameKey}_${deptId}`] = doc;
    });

    // Phase 2: Data validation
    const errors = [];
    const previewData = [];

    data.forEach((row, index) => {
      const rowNum = index + 2;
      const rowDate = row['Date'];
      const rowSite = row['Site Name'] ? String(row['Site Name']).trim() : '';
      const rowBlock = row['Block Name'] ? String(row['Block Name']).trim() : '';
      const rowDept = row['Department Name'] ? String(row['Department Name']).trim() : '';
      const rowDocName = row['Doctor Name'] ? String(row['Doctor Name']).trim() : '';
      const rowTiming = row['Timing'] ? String(row['Timing']).trim() : '';

      let dateStr = '';
      if (!rowDate) {
        errors.push(`Row ${rowNum}: Date is empty.`);
      } else {
        if (typeof rowDate === 'number') {
          // Convert Excel serial number to JS Date
          const jsDate = new Date((rowDate - 25569) * 86400 * 1000);
          dateStr = jsDate.toISOString().split('T')[0];
        } else {
          const d = new Date(rowDate);
          if (isNaN(d.getTime())) {
            errors.push(`Row ${rowNum}: Date '${rowDate}' is invalid.`);
          } else {
            dateStr = d.toISOString().split('T')[0];
          }
        }
      }

      if (!rowSite) {
        errors.push(`Row ${rowNum}: Site Name is empty.`);
      } else if (rowSite.toLowerCase() !== branchLower) {
        errors.push(`Row ${rowNum}: Site Name '${rowSite}' does not match the selected branch '${branch}'.`);
      }

      if (!rowBlock) {
        errors.push(`Row ${rowNum}: Block Name is empty.`);
      } else {
        const blocksForBranch = validBranchLocations[branchLower];
        if (!blocksForBranch || !blocksForBranch.has(rowBlock.toLowerCase())) {
          errors.push(`Row ${rowNum}: Block Name '${rowBlock}' is invalid for branch '${branch}'.`);
        }
      }

      let deptId = null;
      if (!rowDept) {
        errors.push(`Row ${rowNum}: Department Name is empty.`);
      } else {
        deptId = departmentMap[rowDept.toLowerCase()];
        if (!deptId) {
          errors.push(`Row ${rowNum}: Department '${rowDept}' does not exist.`);
        }
      }

      let doctorId = null;
      let employeeId = '';
      if (!rowDocName) {
        errors.push(`Row ${rowNum}: Doctor Name is empty.`);
      } else if (deptId) {
        const key = `${rowDocName.toLowerCase()}_${deptId}`;
        const matchedDoc = doctorLookup[key];
        if (!matchedDoc) {
          errors.push(`Row ${rowNum}: Doctor '${rowDocName}' is not registered under branch '${branch}' and department '${rowDept}'.`);
        } else {
          employeeId = matchedDoc.employee_id;
          doctorId = matchedDoc.id;
        }
      }

      if (!rowTiming) {
        errors.push(`Row ${rowNum}: Timing is empty.`);
      }

      previewData.push({
        date: dateStr,
        site_name: rowSite,
        block_name: rowBlock,
        department: rowDept,
        doctor_name: rowDocName,
        timing: rowTiming,
        employee_id: employeeId,
        doctor_id: doctorId
      });
    });

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Phase 3: Duplicate verification
    const existingToday = await rosterRepository.findTodayRoster({ branch });
    const duplicateExists = existingToday.length > 0;

    return res.status(200).json({
      duplicateExists,
      previewData
    });

  } catch (error) {
    console.error('Preview roster error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Error processing Excel file.' });
  }
}

export async function importRoster(req, res) {
  const { roster } = req.body;

  if (!roster || !Array.isArray(roster) || roster.length === 0) {
    return res.status(400).json({ message: 'Roster data is required.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    let allowedBranches = null;
    if (req.user.role === 'normal_admin') {
      allowedBranches = await userRepository.getUserBranches(req.user.id);
    }

    const validEntries = [];
    const missingDoctors = [];
    const unauthorizedEmployees = [];

    for (const item of roster) {
      const doctor = await doctorRepository.findById(item.doctor_id);

      if (!doctor) {
        missingDoctors.push(item.employee_id || item.doctor_id);
      } else {
        if (allowedBranches && !allowedBranches.map(b => b.toLowerCase()).includes(doctor.branch.toLowerCase())) {
          unauthorizedEmployees.push(doctor.name);
          continue;
        }
        validEntries.push({
          doctor_id: doctor.id,
          timing: item.timing || 'Not Scheduled',
          branch_id: doctor.branch_id
        });
      }
    }

    if (missingDoctors.length > 0) {
      return res.status(400).json({
        message: `Import aborted. Doctor record(s) not found for: ${missingDoctors.join(', ')}`,
      });
    }

    if (unauthorizedEmployees.length > 0) {
      return res.status(403).json({
        message: `Import aborted. No branch permission for: ${unauthorizedEmployees.join(', ')}`,
      });
    }

    await rosterRepository.importRoster(validEntries, today);
    return res.status(200).json({ message: "Today's roster imported successfully." });
  } catch (error) {
    console.error('Import roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getTodayRoster(req, res) {
  const { branch, location } = req.query;

  if (!branch) {
    return res.status(400).json({ message: 'Branch is required.' });
  }

  if (req.user && req.user.role === 'normal_admin') {
    const hasAccess = await userRepository.hasBranchAccess(req.user.id, branch);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this branch.' });
    }
  }

  try {
    const resolvedLoc = await resolveLocation(branch, location);
    const roster = await rosterRepository.findTodayRoster({ branch, location: resolvedLoc || null });
    return res.status(200).json(roster.map((r) => r.toPublic()));
  } catch (error) {
    console.error('Get today roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
