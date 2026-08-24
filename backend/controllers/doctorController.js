import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import doctorRepository from '../repositories/DoctorRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import userRepository from '../repositories/UserRepository.js';
import sittingRepository from '../repositories/SittingRepository.js';
import { notifyUpdate } from '../utils/sse.js';

export async function getDoctors(req, res) {
  try {
    const { search, branch, location, branch_id, location_id, department_id, page, limit, sortBy, sortOrder, locations } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;
    const parsedLocationId = location_id ? parseInt(location_id, 10) : null;
    const parsedLocationsArray = locations ? locations.split(',').map(l => l.trim()) : null;

    if (!page) {
      const doctors = await doctorRepository.findWithFilters({
        branches: branch ? [branch] : (parsedBranchId ? [parsedBranchId] : null),
        locations: parsedLocationsArray || (location ? [location] : (parsedLocationId ? [parsedLocationId] : null)),
        departmentIds: department_id ? [department_id] : null,
        search: search || null,
      });

      return res.status(200).json(doctors.map((d) => d.toPublic()));
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    let paginationParams = {
      page: pageNum,
      limit: limitNum,
      search: search || '',
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
    };

    if (parsedLocationsArray) {
      paginationParams.locations = parsedLocationsArray;
    } else {
      if (location) paginationParams.locationId = location;
      if (parsedLocationId) paginationParams.locationId = parsedLocationId;
    }

    if (branch) paginationParams.branchId = branch;
    if (parsedBranchId) paginationParams.branchId = parsedBranchId;
    if (department_id) paginationParams.departmentId = department_id;

    const { data, totalRecords } = await doctorRepository.findPaginated(paginationParams);
    const totalPages = Math.ceil(totalRecords / limitNum);

    return res.status(200).json({
      success: true,
      data: data.map((d) => d.toPublic()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /doctors/for-shuffling
 * Returns doctors for the Doctor Shuffling (display-day config) page.
 * - normal_admin: filtered to their assigned locations only
 * - super_admin: all doctors
 * - Includes department_status per assignment so the frontend can mark
 *   inactive departments as greyed-out/non-clickable.
 */
export async function getDoctorsForShuffling(req, res) {
  try {
    const { search, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    // Resolve accessible locations for normal_admin
    let locations = null; // null = all (super_admin)
    if (req.user.role === 'normal_admin') {
      const userLocs = await userRepository.getUserLocations(req.user.id);
      // getUserLocations returns [{ branch, location }, ...]
      locations = userLocs.map((l) => l.location); // location names
      // If normal_admin has no locations assigned, return empty
      if (locations.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page: pageNum, limit: limitNum, totalRecords: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        });
      }
    }

    const { data, totalRecords } = await doctorRepository.findPaginatedForShuffling({
      page: pageNum,
      limit: limitNum,
      search: search || '',
      locations,
    });

    const totalPages = Math.ceil(totalRecords / limitNum);

    return res.status(200).json({
      success: true,
      data: data.map((d) => d.toPublic()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get doctors for shuffling error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createDoctor(req, res) {
  let { employee_id, name, designation, assignments } = req.body;
  if (designation) {
    designation = designation.replace(/\s+/g, ' ');
  }

  let parsedAssignments = [];
  if (assignments) {
    try {
      parsedAssignments = JSON.parse(assignments);
    } catch (e) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid assignments format.' });
    }
  }

  if (!employee_id || !name || !designation || !parsedAssignments.length) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Employee ID, Name, Designation, and at least one assignment are required.' });
  }

  // Validate: Single block per branch rule
  const branchBlocks = {};
  for (const assignment of parsedAssignments) {
    if (branchBlocks[assignment.branch_id] && branchBlocks[assignment.branch_id] !== assignment.location_id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'A doctor cannot be assigned to multiple blocks within the same branch.' });
    }
    branchBlocks[assignment.branch_id] = assignment.location_id;
  }

  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const empTaken = await doctorRepository.isEmployeeIdTakenGlobally(employee_id);
    if (empTaken) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'A doctor with this Employee ID already exists.' });
    }

    const id = await doctorRepository.createDoctor({
      employee_id,
      name,
      designation,
      photo_url,
    });

    await doctorRepository.syncAssignments(id, parsedAssignments);

    notifyUpdate();

    return res.status(201).json({
      id,
      employee_id,
      name,
      designation,
      photo_url,
      assignments: parsedAssignments
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateDoctor(req, res) {
  const { id } = req.params;
  let { employee_id, name, designation, status, assignments, remove_photo } = req.body;
  if (designation) {
    designation = designation.replace(/\s+/g, ' ');
  }

  let parsedAssignments = [];
  if (assignments) {
    try {
      parsedAssignments = JSON.parse(assignments);
    } catch (e) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid assignments format.' });
    }
  }

  if (!employee_id || !name || !designation || !parsedAssignments.length) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Employee ID, Name, Designation, and at least one assignment are required.' });
  }

  // Validate: Single block per branch rule
  const branchBlocks = {};
  for (const assignment of parsedAssignments) {
    if (branchBlocks[assignment.branch_id] && branchBlocks[assignment.branch_id] !== assignment.location_id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'A doctor cannot be assigned to multiple blocks within the same branch.' });
    }
    branchBlocks[assignment.branch_id] = assignment.location_id;
  }

  try {
    const existing = await doctorRepository.findById(id);
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    if (req.user && req.user.role === 'normal_admin') {
      // Get the admin's allowed branch names (branch-level scoping, not location-level)
      const userBranchNames = await userRepository.getUserBranches(req.user.id);

      // Preserve assignments from branches outside the admin's scope (read-only to them)
      const preservedAssignments = (existing.assignments || [])
        .filter(ea => !userBranchNames.includes(ea.branch_name))
        .map(ea => ({
          branch_id: ea.branch_id,
          location_id: ea.location_id,
          department_id: ea.department_id,
          shift_time: ea.shift_time || null,
        }));

      // Only accept the assignments from the frontend that belong to the admin's own branches
      const ownBranchAssignments = parsedAssignments.filter(pa =>
        userBranchNames.includes(pa.branch_name)
      );

      // Merge: preserved out-of-scope + admin's own-branch changes
      parsedAssignments = [...preservedAssignments, ...ownBranchAssignments];
    }

    const empTaken = await doctorRepository.isEmployeeIdTakenGlobally(employee_id, id);
    if (empTaken) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Another doctor with this Employee ID already exists.' });
    }

    // Validate: Prevent name change for an existing Employee ID
    const normalizeNameForCompare = (n) => n?.trim().replace(/\s+/g, ' ').toUpperCase();
    if (normalizeNameForCompare(name) !== normalizeNameForCompare(existing.name)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: `Doctor name cannot be changed. The registered name for Employee ID '${employee_id}' is '${existing.name}'. Please use the correct name.`
      });
    }

    let photo_url = existing.photo_url;
    if (req.file) {
      if (existing.photo_url) {
        const oldPath = path.join(process.cwd(), existing.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = `/uploads/${req.file.filename}`;
    } else if (remove_photo === 'true' || remove_photo === true) {
      if (existing.photo_url) {
        const oldPath = path.join(process.cwd(), existing.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = null;
    }

    const parsedStatus = status !== undefined ? (status == 'true' || status == 1 ? 1 : 0) : 1;

    await doctorRepository.updateDoctor(id, {
      employee_id,
      name,
      designation,
      photo_url,
      status: parsedStatus,
    });

    await doctorRepository.syncAssignments(id, parsedAssignments);

    notifyUpdate();

    return res.status(200).json({
      id,
      employee_id,
      name,
      designation,
      photo_url,
      status: !!parsedStatus,
      assignments: parsedAssignments
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteDoctor(req, res) {
  const { id } = req.params;

  if (req.user && req.user.role === 'normal_admin') {
    return res.status(403).json({ message: 'Admin users are not allowed to delete doctors. Only Super Admins can delete doctors.' });
  }

  try {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    await doctorRepository.deleteById(id);

    if (doctor.photo_url) {
      const photoPath = path.join(process.cwd(), doctor.photo_url);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    notifyUpdate();

    return res.status(200).json({ message: 'Doctor deleted successfully.' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function downloadDoctorTemplate(req, res) {
  try {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([
      ['CLINICIAN', 'EMPLOYEE ID', 'TITLE / DESIGNATION', 'DEPARTMENTS', 'BRANCHES', 'LOCATIONS', 'AVAILABLE DAYS', 'SHIFT TIME'],
      ['Dr. AMARESH MISHRA', '001', 'SR', 'DERMATOLOGY', 'PBMH', 'A BLOCK', 'MON, TUE, WED, THU, FRI, SAT', '10:00 AM - 02:00 PM'],
      ['Dr. AMARESH MISHRA', '001', 'SR', 'DERMATOLOGY', 'SSCC', 'KSS', 'MON, TUE, WED, THU, FRI, SAT', '04:00 PM - 08:00 PM'],
      ['Dr. JANE SMITH', '002', 'Cardiologist', 'Cardiology', 'PBMH', 'B BLOCK', 'MON, WED, FRI', '09:00 AM - 05:00 PM'],
      ['Dr. RAJESH KUMAR', '003', 'Consultant Neurologist', 'Neurology', 'PBMH', 'A BLOCK', '', ''],
      ['Dr. PRIYA SHARMA', '004', 'Pediatrician', 'Pediatrics', 'SSCC', 'KSS', 'MON, TUE, THU', '']
    ]);

    // Auto-size columns slightly
    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 }
    ];
    ws['!cols'] = wscols;

    xlsx.utils.book_append_sheet(wb, ws, "Template");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="doctor_upload_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function uploadBulkDoctors(req, res) {
  try {
    if (req.user.role !== 'super_admin') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Only Super Admins can bulk upload.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Cleanup file
    fs.unlinkSync(req.file.path);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Empty Excel file.' });
    }

    // Group by Employee ID to gather all assignments
    const doctorsMap = new Map();

    // Cache to minimize DB queries
    const branchCache = {}; // name -> id
    const branchNameById = {}; // id -> name
    const locCache = {}; // branchId_name -> id
    const locationNameById = {}; // id -> name
    const deptCache = {}; // branchId_locationId_name -> id

    // Load existing masters to memory for quick mapping
    const allBranches = await branchRepository.findAll();
    allBranches.forEach((b) => {
      branchCache[b.name.toLowerCase()] = b.id;
      branchNameById[b.id] = b.name;
    });

    const allLocations = await locationRepository.findAll();
    allLocations.forEach((l) => {
      locCache[`${l.branch_id}_${l.name.toLowerCase()}`] = l.id;
      locationNameById[l.id] = l.name;
    });

    const allDepts = await departmentRepository.findAll();
    allDepts.forEach(d => deptCache[`${d.branch_id}_${d.location_id}_${d.name.toLowerCase()}`] = d.id);

    let successCount = 0;
    let errorCount = 0;
    const errorDetails = [];

    for (const row of data) {
      const name = (row['CLINICIAN'] || row['DOCTOR NAME'] || row['DOCTOR'] || row['NAME'])?.toString().trim();
      let empId = (row['EMPLOYEE ID'] || row['EMPLOYEE_ID'] || row['EMP ID'] || row['EMPID'] || row['EMPLOYEEID'])?.toString().trim();
      const rawDesignation = (row['TITLE / DESIGNATION'] || row['TITLE/DESIGNATION'] || row['DESIGNATION'] || row['TITLE'])?.toString().trim();
      const designation = rawDesignation ? rawDesignation.replace(/\s+/g, ' ') : null;
      const departmentName = (row['DEPARTMENTS'] || row['DEPARTMENT'] || row['DEPT'])?.toString().trim();
      const branchName = (row['BRANCHES'] || row['BRANCH'] || row['SITE'] || row['SITE NAME'])?.toString().trim();
      const locationName = (row['LOCATIONS'] || row['LOCATION'] || row['BLOCK'] || row['BLOCK NAME'])?.toString().trim();
      const rawShiftTime = (row['SHIFT TIME'] || row['SHIFT TIMING'] || row['TIMING'] || row['SHIFT'] || row['SHIFTS'])?.toString().trim() || null;

      // Mandatory fields check (AVAILABLE DAYS and SHIFT TIME are strictly optional)
      if (!name || !empId || !designation || !departmentName || !branchName || !locationName) {
        errorCount++;
        const missing = [];
        if (!name) missing.push('CLINICIAN');
        if (!empId) missing.push('EMPLOYEE ID');
        if (!designation) missing.push('TITLE / DESIGNATION');
        if (!departmentName) missing.push('DEPARTMENTS');
        if (!branchName) missing.push('BRANCHES');
        if (!locationName) missing.push('LOCATIONS');
        errorDetails.push(`Row skipped for Employee ID '${empId || 'N/A'}': Missing mandatory field(s): ${missing.join(', ')}.`);
        continue;
      }

      // Add Dr. prefix if missing
      let formattedName = name;
      if (!/^Dr\.\s/i.test(formattedName)) {
        if (/^Dr/i.test(formattedName)) {
          formattedName = formattedName.replace(/^Dr\.?\s*/i, 'Dr. ');
        } else {
          formattedName = 'Dr. ' + formattedName;
        }
      }

      // Resolve IDs
      const branchId = branchCache[branchName.toLowerCase()];
      if (!branchId) {
        errorCount++;
        errorDetails.push(`Employee '${empId}' (${formattedName}): Branch '${branchName}' not found in master data.`);
        continue;
      }

      const locId = locCache[`${branchId}_${locationName.toLowerCase()}`];
      if (!locId) {
        errorCount++;
        errorDetails.push(`Employee '${empId}' (${formattedName}): Location '${locationName}' not found under branch '${branchName}'.`);
        continue;
      }

      const deptId = deptCache[`${branchId}_${locId}_${departmentName.toLowerCase()}`];
      if (!deptId) {
        errorCount++;
        errorDetails.push(`Employee '${empId}' (${formattedName}): Department '${departmentName}' not found in master data for this Branch and Location.`);
        continue;
      }

      // Available Days (optional)
      const rawDays = (row['AVAILABLE DAYS'] || row['AVAILABLE_DAYS'] || row['DAYS'] || row['AVAILABLE DAY'])?.toString().trim();
      let parsedDays = null;
      if (rawDays) {
        const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const tokens = rawDays.toUpperCase().split(/[\s,]+/);
        const set = new Set();
        for (const token of tokens) {
          const clean = token.replace(/[^A-Z]/g, '');
          if (clean === 'DAILY' || clean === 'ALL' || clean === 'ALLDAYS') {
            VALID_DAYS.forEach(d => set.add(d));
          } else if (VALID_DAYS.includes(clean)) {
            set.add(clean);
          } else {
            const match = VALID_DAYS.find(d => clean.startsWith(d));
            if (match) set.add(match);
          }
        }
        if (set.size > 0) {
          parsedDays = VALID_DAYS.filter(d => set.has(d));
        }
      }

      if (!doctorsMap.has(empId)) {
        doctorsMap.set(empId, {
          employee_id: empId,
          name: formattedName,
          designation,
          status: 1, // Default active
          assignments: [],
          branch_days: {}
        });
      }

      const doc = doctorsMap.get(empId);
      if (parsedDays && parsedDays.length > 0) {
        doc.branch_days[branchName.toUpperCase()] = parsedDays;
      }

      // Validate: A doctor cannot be assigned to multiple blocks/locations within the same branch
      const existingBranchAssign = doc.assignments.find(a => a.branch_id === branchId);
      if (existingBranchAssign) {
        if (existingBranchAssign.location_id !== locId) {
          errorCount++;
          errorDetails.push(`Employee '${empId}' (${formattedName}): Cannot assign doctor to multiple blocks ('${locationName}') within the same branch '${branchName}'.`);
          continue;
        }
        // If same branch and location, check if duplicate exact assignment
        const exists = doc.assignments.some(a => a.branch_id === branchId && a.location_id === locId && a.department_id === deptId);
        if (!exists) {
          doc.assignments.push({ branch_id: branchId, location_id: locId, department_id: deptId, shift_time: rawShiftTime || null });
        }
      } else {
        // Different branch (e.g. PBMH then SSCC) -> ALLOWED!
        doc.assignments.push({ branch_id: branchId, location_id: locId, department_id: deptId, shift_time: rawShiftTime || null });
      }
    }

    const normalizeNameForCompare = (n) => n?.trim().replace(/\s+/g, ' ').toUpperCase();

    // Process grouped doctors
    for (const [empId, docData] of doctorsMap.entries()) {
      if (docData.assignments.length === 0) continue;

      // Check if exists
      const existing = await doctorRepository.findByEmployeeId(empId);
      if (existing) {
        // Validate: name in the upload must match the registered name exactly (case-insensitive)
        if (normalizeNameForCompare(docData.name) !== normalizeNameForCompare(existing.name)) {
          errorCount++;
          errorDetails.push(`Employee '${empId}': Name mismatch — Upload has '${docData.name}' but the registered name is '${existing.name}'. This doctor was skipped. Please use the correct name.`);
          continue;
        }

        // Find which branches are in the new upload
        const newBranchIds = [...new Set(docData.assignments.map(a => a.branch_id))];

        // Keep existing assignments if their branch_id is NOT in the new upload
        const preservedAssignments = (existing.assignments || [])
          .filter(ea => !newBranchIds.includes(ea.branch_id))
          .map(ea => ({
            branch_id: ea.branch_id,
            location_id: ea.location_id,
            department_id: ea.department_id,
            shift_time: ea.shift_time || null
          }));

        // Combine preserved assignments with the new ones
        const mergedAssignments = [...preservedAssignments, ...docData.assignments];

        // Update existing doctor (name is preserved since it was validated above)
        await doctorRepository.updateDoctor(existing.id, {
          employee_id: docData.employee_id,
          name: existing.name, // Always use the registered name, never overwrite with upload data
          designation: docData.designation,
          status: docData.status,
          photo_url: existing.photo_url,
        });
        await doctorRepository.syncAssignments(existing.id, mergedAssignments);
      } else {
        // Create new doctor
        const newId = await doctorRepository.createDoctor({
          employee_id: docData.employee_id,
          name: docData.name,
          designation: docData.designation,
          photo_url: null,
          status: docData.status,
        });
        await doctorRepository.syncAssignments(newId, docData.assignments);
      }

      // Upsert display_days per branch/location assignment if provided
      if (docData.branch_days && Object.keys(docData.branch_days).length > 0) {
        for (const assignment of docData.assignments) {
          const branchName = branchNameById[assignment.branch_id];
          const locationName = locationNameById[assignment.location_id];
          if (!branchName || !locationName) continue;

          const days = docData.branch_days[branchName.toUpperCase()];
          if (Array.isArray(days) && days.length > 0) {
            await sittingRepository.upsertSitting(empId, assignment.branch_id, assignment.location_id, days);
          }
        }
      }

      successCount++;
    }

    notifyUpdate();

    let responseMsg = `Bulk upload completed. Processed ${successCount} doctor profile(s).`;
    if (errorCount > 0) {
      responseMsg += ` Skipped ${errorCount} row(s) due to validation/master data issues.`;
    }

    return res.status(200).json({
      message: responseMsg,
      errors: errorDetails
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Internal server error: ' + error.message, stack: error.stack });
  }
}
