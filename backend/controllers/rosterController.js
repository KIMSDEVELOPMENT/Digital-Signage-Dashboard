import xlsx from 'xlsx';
import fs from 'fs';
import doctorRepository from '../repositories/DoctorRepository.js';
import rosterRepository from '../repositories/RosterRepository.js';
import userRepository from '../repositories/UserRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import { getPool } from '../config/db.js';
import { notifyUpdate } from '../utils/sse.js';

// Helper to get local date string YYYY-MM-DD
function getTodayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format Date or string to YYYY-MM-DD
function formatDateOnly(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

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
  const { branch, date } = req.query;
  if (!branch) {
    return res.status(400).json({ message: 'Branch parameter is required.' });
  }

  let dateFormatted = '';
  if (date) {
    // Format YYYY-MM-DD to DD/MM/YYYY for the Excel template
    const parts = date.split('-');
    if (parts.length === 3) {
      dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      dateFormatted = date;
    }
  }

  try {
    const wsSchedule = xlsx.utils.json_to_sheet([
      { 'Date': dateFormatted, 'Site Name': branch, 'Block Name': '', 'Department Name': '', 'Doctor Name': '' }
    ], {
      header: ['Date', 'Site Name', 'Block Name', 'Department Name', 'Doctor Name'],
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

  const { branch, date } = req.query;
  if (!branch) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Branch parameter is required.' });
  }

  try {
    const todayStr = getTodayDateString();
    // Validate target date is not in the past
    if (date && date < todayStr) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: 'Past rosters cannot be modified. Duty roster modification is only allowed for today and future dates.' 
      });
    }

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

    const expectedHeaders = ['Date', 'Site Name', 'Block Name', 'Department Name', 'Doctor Name'];
    let isHeaderValid = true;
    if (headers.length < 5) {
      isHeaderValid = false;
    } else {
      for (let i = 0; i < expectedHeaders.length; i++) {
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
      let nameKey = doc.name.trim().toLowerCase();
      if (nameKey.startsWith('dr. ')) nameKey = nameKey.substring(4);
      else if (nameKey.startsWith('dr ')) nameKey = nameKey.substring(3);
      nameKey = nameKey.trim();
      
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
      const rowTiming = '09:00 AM - 05:00 PM';

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
        
        // Past date validation
        if (dateStr && dateStr < todayStr) {
          errors.push(`Row ${rowNum}: Past dates (${dateStr}) cannot be uploaded or modified. Schedule date must be today or a future date.`);
        }

        // Mismatch validation
        if (date && dateStr && dateStr !== date) {
          errors.push(`Row ${rowNum}: Date in excel '${dateStr}' does not match the selected target date '${date}'.`);
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
        let docNameLower = rowDocName.trim().toLowerCase();
        if (docNameLower.startsWith('dr. ')) docNameLower = docNameLower.substring(4);
        else if (docNameLower.startsWith('dr ')) docNameLower = docNameLower.substring(3);
        docNameLower = docNameLower.trim();
        
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
  let roster = req.body.roster;
  
  if (typeof roster === 'string') {
    try {
      roster = JSON.parse(roster);
    } catch (e) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid roster data format.' });
    }
  }

  if (!roster || !Array.isArray(roster) || roster.length === 0) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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

    const todayStr = getTodayDateString();
    for (const item of roster) {
      if (item.date && item.date < todayStr) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Past rosters cannot be modified. Cannot import roster for past dates.' });
      }
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
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: `Import aborted. Doctor record(s) not found for: ${missingDoctors.join(', ')}`,
      });
    }

    if (unauthorizedEmployees.length > 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        message: `Import aborted. No branch permission for: ${unauthorizedEmployees.join(', ')}`,
      });
    }

    await rosterRepository.importRoster(validEntries);
    
    // Save file to archive if present
    if (req.file && validEntries.length > 0) {
      const branchId = validEntries[0].branch_id;
      const originalName = req.file.originalname;
      
      const uploadDir = 'uploads/rosters';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const newFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${originalName}`;
      const newFilePath = `${uploadDir}/${newFileName}`;
      
      fs.renameSync(req.file.path, newFilePath);
      
      const pool = getPool();
      await pool.query(
        'INSERT INTO roster_archives (original_filename, stored_filepath, branch_id, uploaded_by) VALUES (?, ?, ?, ?)',
        [originalName, newFilePath, branchId, req.user ? req.user.id : null]
      );
    } else if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    notifyUpdate();
    return res.status(200).json({ message: "Roster imported successfully." });
  } catch (error) {
    console.error('Import roster error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
  const { date, doctor_id, timing, branch, location } = req.body;

  if (!date || !doctor_id || !timing || !branch) {
    return res.status(400).json({ message: 'Date, doctor ID, timing, and branch are required.' });
  }

  const todayStr = getTodayDateString();
  if (date < todayStr) {
    return res.status(400).json({ message: 'Past rosters cannot be modified. Cannot add roster entries for past dates.' });
  }

  try {
    const doctor = await doctorRepository.findById(doctor_id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const targetAssignments = doctor.assignments.filter(a => 
      a.branch_name && a.branch_name.toLowerCase() === branch.toLowerCase() && 
      (!location || (a.location_name && a.location_name.toLowerCase() === location.toLowerCase()))
    );

    if (targetAssignments.length === 0) {
      return res.status(400).json({ message: 'Doctor is not assigned to this branch or block.' });
    }

    if (req.user && req.user.role === 'normal_admin') {
      // Check permissions for all target assignments
      for (const assignment of targetAssignments) {
        const hasAccess = await userRepository.hasLocationAccess(req.user.id, branch, assignment.location_name);
        if (!hasAccess) {
          return res.status(403).json({ message: `You do not have permission for the block: ${assignment.location_name}.` });
        }
      }
    }

    for (const assignment of targetAssignments) {
      await rosterRepository.addManualEntry({
        date,
        doctor_id: doctor.id,
        timing,
        branch_id: assignment.branch_id,
        location_id: assignment.location_id
      });
    }

    notifyUpdate();
    return res.status(201).json({ message: 'Manual roster entry added successfully.' });
  } catch (error) {
    console.error('Add manual roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateManualRoster(req, res) {
  const { id } = req.params;
  const { timing, doctor_id } = req.body;

  if (!timing && !doctor_id) {
    return res.status(400).json({ message: 'Timing or doctor ID is required.' });
  }

  try {
    const entry = await rosterRepository.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Roster entry not found.' });
    }

    const entryDate = formatDateOnly(entry.date);
    const todayStr = getTodayDateString();
    if (entryDate && entryDate < todayStr) {
      return res.status(400).json({ message: 'Past rosters cannot be modified. Cannot modify roster entries for past dates.' });
    }

    if (req.user && req.user.role === 'normal_admin') {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, entry.branch_name, entry.location_name);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to edit roster entries for this location.' });
      }
    }

    if (doctor_id) {
      const doctor = await doctorRepository.findById(doctor_id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found.' });
      }
    }

    await rosterRepository.updateManualEntry(id, { doctor_id, timing });
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
    const entry = await rosterRepository.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Roster entry not found.' });
    }

    const entryDate = formatDateOnly(entry.date);
    const todayStr = getTodayDateString();
    if (entryDate && entryDate < todayStr) {
      return res.status(400).json({ message: 'Past rosters cannot be modified. Cannot delete roster entries for past dates.' });
    }

    if (req.user && req.user.role === 'normal_admin') {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, entry.branch_name, entry.location_name);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to delete roster entries for this location.' });
      }
    }

    await rosterRepository.deleteManualEntry(id);
    notifyUpdate();
    return res.status(200).json({ message: 'Manual roster entry deleted.' });
  } catch (error) {
    console.error('Delete manual roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getArchivedFiles(req, res) {
  try {
    const pool = getPool();
    const { branch } = req.query;
    let query = `
      SELECT ra.id, ra.original_filename, ra.uploaded_at, b.name AS branch_name, u.full_name AS uploaded_by_name
      FROM roster_archives ra
      JOIN branches b ON ra.branch_id = b.id
      LEFT JOIN users u ON ra.uploaded_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (req.user && req.user.role === 'normal_admin') {
      const allowedBranches = await userRepository.getUserBranches(req.user.id);
      if (allowedBranches.length === 0) {
        return res.status(200).json([]);
      }
      if (branch) {
        if (!allowedBranches.map(b => b.toLowerCase()).includes(branch.toLowerCase())) {
          return res.status(403).json({ message: 'You do not have permission for this branch.' });
        }
        conditions.push('LOWER(b.name) = LOWER(?)');
        params.push(branch);
      } else {
        conditions.push('b.name IN (?)');
        params.push(allowedBranches);
      }
    } else if (branch) {
      conditions.push('LOWER(b.name) = LOWER(?)');
      params.push(branch);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ra.uploaded_at DESC';
    const [rows] = await pool.query(query, params);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get archived files error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function downloadArchivedFile(req, res) {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM roster_archives WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }
    
    const fileRecord = rows[0];
    
    if (req.user && req.user.role === 'normal_admin') {
      const [branchRows] = await pool.query('SELECT name FROM branches WHERE id = ?', [fileRecord.branch_id]);
      const branchName = branchRows.length > 0 ? branchRows[0].name : '';
      const allowedBranches = await userRepository.getUserBranches(req.user.id);
      
      if (!allowedBranches.includes(branchName)) {
        return res.status(403).json({ message: 'You do not have access to download this file.' });
      }
    }

    if (!fs.existsSync(fileRecord.stored_filepath)) {
      return res.status(404).json({ message: 'Physical file not found on server.' });
    }

    res.download(fileRecord.stored_filepath, fileRecord.original_filename);
  } catch (error) {
    console.error('Download archived file error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteArchivedFile(req, res) {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM roster_archives WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }
    
    const fileRecord = rows[0];
    
    if (req.user && req.user.role === 'normal_admin') {
      const [branchRows] = await pool.query('SELECT name FROM branches WHERE id = ?', [fileRecord.branch_id]);
      const branchName = branchRows.length > 0 ? branchRows[0].name : '';
      const allowedBranches = await userRepository.getUserBranches(req.user.id);
      
      if (!allowedBranches.includes(branchName)) {
        return res.status(403).json({ message: 'You do not have access to delete this file.' });
      }
    }

    // Delete physical file
    if (fs.existsSync(fileRecord.stored_filepath)) {
      fs.unlinkSync(fileRecord.stored_filepath);
    }
    
    // Delete database record
    await pool.query('DELETE FROM roster_archives WHERE id = ?', [id]);
    
    return res.status(200).json({ message: 'Archived file deleted successfully.' });
  } catch (error) {
    console.error('Delete archived file error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
