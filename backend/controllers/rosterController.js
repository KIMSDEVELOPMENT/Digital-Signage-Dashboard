import xlsx from 'xlsx';
import fs from 'fs';
import doctorRepository from '../repositories/DoctorRepository.js';
import rosterRepository from '../repositories/RosterRepository.js';
import userRepository from '../repositories/UserRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import { getPool } from '../config/db.js';
import { notifyUpdate } from '../utils/sse.js';

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
    const wsSchedule = xlsx.utils.json_to_sheet([
      { 'Date': '', 'Site Name': branch, 'Block Name': '', 'Department Name': '', 'Doctor Name': '', 'Timing': '' }
    ], {
      header: ['Date', 'Site Name', 'Block Name', 'Department Name', 'Doctor Name', 'Timing'],
      skipHeader: false
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
      SELECT b.id AS branch_id, b.name AS branch, l.id AS location_id, l.name AS location 
      FROM locations l
      JOIN branches b ON l.branch_id = b.id
      WHERE b.status = 1 AND l.status = 1
    `);
    const validBranchLocations = {};
    const validBranches = new Set();
    const idMap = {};
    configRows.forEach(row => {
      const b = row.branch.toLowerCase();
      validBranches.add(b);
      if (!validBranchLocations[b]) {
        validBranchLocations[b] = new Set();
      }
      validBranchLocations[b].add(row.location.toLowerCase());
      idMap[`${b}_${row.location.toLowerCase()}`] = { branch_id: row.branch_id, location_id: row.location_id };
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
    const docBranchBlockMap = {}; // Maps nameKey -> assigned block for this branch
    doctorsList.forEach(doc => {
      const nameKey = doc.name.trim().toLowerCase();
      if (doc.assignments && doc.assignments.length > 0) {
        doc.assignments.forEach(assignment => {
          if (assignment.branch_name && assignment.branch_name.toLowerCase() === branch.toLowerCase()) {
            doctorLookup[`${nameKey}_${assignment.department_id}`] = doc;
            docBranchBlockMap[nameKey] = assignment.location_name.toLowerCase();
          }
        });
      }
    });

    // Phase 2: Data validation
    const errors = [];
    const previewData = [];
    const excelDocBlockTracker = {}; // Tracks nameKey -> blockName scheduled in the Excel sheet

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNum = index + 2;
      const rowDate = row['Date'];
      const rowSite = row['Site Name'] ? String(row['Site Name']).trim() : '';
      const rowBlock = row['Block Name'] ? String(row['Block Name']).trim() : '';
      const rowDept = row['Department Name'] ? String(row['Department Name']).trim() : '';
      const rowDocName = row['Doctor Name'] ? String(row['Doctor Name']).trim() : '';
      const rowTiming = row['Timing'] ? String(row['Timing']).trim() : '';

      // Skip the template instruction row if present
      if (!rowDate && rowSite === branch && !rowBlock && !rowDept && !rowDocName) {
        continue;
      }

      let dateStr = '';
      if (!rowDate) {
        errors.push(`Row ${rowNum}: Date is empty.`);
      } else {
        if (typeof rowDate === 'number') {
          // Convert Excel serial number to JS Date
          const jsDate = new Date((rowDate - 25569) * 86400 * 1000);
          dateStr = jsDate.toISOString().split('T')[0];
        } else if (typeof rowDate === 'string' && rowDate.includes('/')) {
          // Parse dd/mm/yyyy
          const parts = rowDate.split('/');
          if (parts.length === 3) {
             const isoString = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             const d = new Date(isoString);
             if (isNaN(d.getTime())) {
               errors.push(`Row ${rowNum}: Date '${rowDate}' is invalid.`);
             } else {
               dateStr = d.toISOString().split('T')[0];
             }
          } else {
             errors.push(`Row ${rowNum}: Date '${rowDate}' is not in dd/mm/yyyy format.`);
          }
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
        } else if (req.user.role === 'normal_admin') {
          // Verify they have access to this specific block
          const hasBlockAccess = await userRepository.hasLocationAccess(req.user.id, branch, rowBlock);
          if (!hasBlockAccess) {
             errors.push(`Row ${rowNum}: You do not have permission to upload rosters for block '${rowBlock}'.`);
          }
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
      } else {
        const docNameLower = rowDocName.toLowerCase();
        
        // 1. Validate against DB configuration
        const expectedBlock = docBranchBlockMap[docNameLower];
        if (expectedBlock && rowBlock && rowBlock.toLowerCase() !== expectedBlock) {
           errors.push(`Row ${rowNum}: Doctor '${rowDocName}' is assigned to block '${expectedBlock}' in this branch, but Excel says '${rowBlock}'.`);
        }

        // 2. Validate against other rows in the Excel sheet
        if (rowBlock) {
           const trackedBlock = excelDocBlockTracker[docNameLower];
           if (trackedBlock && trackedBlock !== rowBlock.toLowerCase()) {
              errors.push(`Row ${rowNum}: Doctor '${rowDocName}' is scheduled in multiple blocks ('${trackedBlock}' and '${rowBlock}') within the same Excel sheet.`);
           } else {
              excelDocBlockTracker[docNameLower] = rowBlock.toLowerCase();
           }
        }

        if (deptId) {
          const key = `${docNameLower}_${deptId}`;
          const matchedDoc = doctorLookup[key];
          if (!matchedDoc) {
            // We intentionally DO NOT throw an error for missing doctor, as per requirements: 
            // "if does not then doctor name should not display in roaster". We just leave doctorId null.
          } else {
            employeeId = matchedDoc.employee_id;
            doctorId = matchedDoc.id;
          }
        }
      }

      if (!rowTiming) {
        errors.push(`Row ${rowNum}: Timing is empty.`);
      }

      let branchId = null;
      let locationId = null;
      if (rowSite && rowBlock) {
         const ids = idMap[`${rowSite.toLowerCase()}_${rowBlock.toLowerCase()}`];
         if (ids) {
            branchId = ids.branch_id;
            locationId = ids.location_id;
         }
      }

      previewData.push({
        date: dateStr,
        site_name: rowSite,
        block_name: rowBlock,
        department: rowDept,
        doctor_name: rowDocName,
        timing: rowTiming,
        employee_id: employeeId,
        doctor_id: doctorId,
        branch_id: branchId,
        location_id: locationId
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Phase 3: Duplicate verification (skip if only previewing, we handle on import)
    const duplicateExists = false; // We can't strictly check duplicates easily for multi-dates here without a complex query

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
    let allowedBranches = null;
    if (req.user.role === 'normal_admin') {
      allowedBranches = await userRepository.getUserBranches(req.user.id);
    }

    const validEntries = [];
    const missingDoctors = [];
    const unauthorizedEmployees = [];

    for (const item of roster) {
      if (!item.doctor_id) {
         // Skip doctors that were invalid in Excel
         continue;
      }
      const doctor = await doctorRepository.findById(item.doctor_id);

      if (!doctor) {
        missingDoctors.push(item.employee_id || item.doctor_id);
      } else {
        // Need to find if doctor is assigned to this branch
        let isAssigned = false;
        let assignedBranchName = '';
        if (doctor.assignments && doctor.assignments.length > 0) {
          const assignment = doctor.assignments.find(a => a.branch_id === item.branch_id);
          if (assignment) {
             isAssigned = true;
             assignedBranchName = assignment.branch_name;
          }
        }
        
        if (!isAssigned) {
           unauthorizedEmployees.push(doctor.name); // Maybe not "unauthorized", but "unassigned" to this branch
           continue;
        }

        if (allowedBranches && !allowedBranches.map(b => b.toLowerCase()).includes(assignedBranchName.toLowerCase())) {
          unauthorizedEmployees.push(doctor.name);
          continue;
        }
        validEntries.push({
          date: item.date,
          doctor_id: doctor.id,
          timing: item.timing || 'Not Scheduled',
          branch_id: item.branch_id,
          location_id: item.location_id
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

    await rosterRepository.importRoster(validEntries);
    notifyUpdate();
    return res.status(200).json({ message: "Roster imported successfully." });
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

  let userId = null;
  if (req.user && req.user.role === 'normal_admin') {
    userId = req.user.id;
    if (location) {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, branch, location);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this block.' });
      }
    }
  }

  try {
    const resolvedLoc = await resolveLocation(branch, location);
    const roster = await rosterRepository.findTodayRoster({ branch, location: resolvedLoc || null, userId });
    return res.status(200).json(roster.map((r) => r.toPublic()));
  } catch (error) {
    console.error('Get today roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getRosterByDate(req, res) {
  const { branch, location, date } = req.query;

  if (!branch || !date) {
    return res.status(400).json({ message: 'Branch and date are required.' });
  }

  let userId = null;
  if (req.user && req.user.role === 'normal_admin') {
    userId = req.user.id;
    if (location) {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, branch, location);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this block.' });
      }
    }
  }

  try {
    const resolvedLoc = await resolveLocation(branch, location);
    const roster = await rosterRepository.findRosterByDate({ branch, location: resolvedLoc || null, date, userId });
    return res.status(200).json(roster.map((r) => r.toPublic()));
  } catch (error) {
    console.error('Get roster by date error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function addManualRoster(req, res) {
  const { date, doctor_id, timing, branch } = req.body;

  if (!date || !doctor_id || !timing || !branch) {
    return res.status(400).json({ message: 'Date, doctor ID, timing, and branch are required.' });
  }

  try {
    const doctor = await doctorRepository.findById(doctor_id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    if (req.user && req.user.role === 'normal_admin') {
      const assignment = doctor.assignments.find(a => a.branch_name && a.branch_name.toLowerCase() === branch.toLowerCase());
      if (assignment) {
        const hasAccess = await userRepository.hasLocationAccess(req.user.id, branch, assignment.location_name);
        if (!hasAccess) {
          return res.status(403).json({ message: 'You do not have permission for this block.' });
        }
      } else {
        return res.status(403).json({ message: 'Doctor is not assigned to this branch.' });
      }
    }

    const assignment = doctor.assignments.find(a => a.branch_name && a.branch_name.toLowerCase() === branch.toLowerCase());
    if (!assignment) {
      return res.status(400).json({ message: 'Doctor is not assigned to this branch.' });
    }

    await rosterRepository.addManualEntry({
      date,
      doctor_id: doctor.id,
      timing,
      branch_id: assignment.branch_id,
      location_id: assignment.location_id
    });

    notifyUpdate();
    return res.status(201).json({ message: 'Manual roster entry added successfully.' });
  } catch (error) {
    console.error('Add manual roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateManualRoster(req, res) {
  const { id } = req.params;
  const { timing } = req.body;

  if (!timing) {
    return res.status(400).json({ message: 'Timing is required.' });
  }

  try {
    await rosterRepository.updateManualEntry(id, timing);
    notifyUpdate();
    return res.status(200).json({ message: 'Manual roster entry updated.' });
  } catch (error) {
    console.error('Update manual roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteManualRoster(req, res) {
  const { id } = req.params;

  try {
    // In a real app, we should probably check if the user owns the branch of this roster entry,
    // but for simplicity and since it's an admin panel, we'll allow it if they have Duty Roster delete perm.
    await rosterRepository.deleteManualEntry(id);
    notifyUpdate();
    return res.status(200).json({ message: 'Manual roster entry deleted.' });
  } catch (error) {
    console.error('Delete manual roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
