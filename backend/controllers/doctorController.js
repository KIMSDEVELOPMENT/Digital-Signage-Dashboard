import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import doctorRepository from '../repositories/DoctorRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { notifyUpdate } from '../utils/sse.js';

export async function getDoctors(req, res) {
  try {
    const { search, branch, location, branch_id, location_id, department_id, page, limit, sortBy, sortOrder } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;
    const parsedLocationId = location_id ? parseInt(location_id, 10) : null;

    if (!page) {
      const doctors = await doctorRepository.findWithFilters({
        branches: branch ? [branch] : (parsedBranchId ? [parsedBranchId] : null),
        locations: location ? [location] : (parsedLocationId ? [parsedLocationId] : null),
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

    if (branch) paginationParams.branchId = branch;
    if (location) paginationParams.locationId = location; // Actually, in findPaginated, locationId is used. But wait, we should pass location name properly if needed. In findPaginated, if locationId is a string it's handled as l.name!
    if (parsedBranchId) paginationParams.branchId = parsedBranchId;
    if (parsedLocationId) paginationParams.locationId = parsedLocationId;
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

export async function createDoctor(req, res) {
  const { employee_id, name, designation, assignments } = req.body;
  
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
  const { employee_id, name, designation, status, assignments } = req.body;

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

    const empTaken = await doctorRepository.isEmployeeIdTakenGlobally(employee_id, id);
    if (empTaken) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Another doctor with this Employee ID already exists.' });
    }

    let photo_url = existing.photo_url;
    if (req.file) {
      if (existing.photo_url) {
        const oldPath = path.join(process.cwd(), existing.photo_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photo_url = `/uploads/${req.file.filename}`;
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
      ['CLINICIAN', 'EMPLOYEE ID', 'TITLE / DESIGNATION', 'DEPARTMENTS', 'BRANCHES', 'LOCATIONS'],
      ['Dr. John Doe', 'EMP001', 'Cardiologist', 'Cardiology', 'Main Hospital', 'Block A'],
      ['Dr. Jane Smith', 'EMP002', 'Neurologist', 'Neurology', 'Main Hospital', 'Block B']
    ]);
    
    // Auto-size columns slightly
    const wscols = [
      {wch: 25}, {wch: 15}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 20}
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
    const locCache = {}; // branchId_name -> id
    const deptCache = {}; // name -> id

    // Load existing masters to memory for quick mapping
    const allBranches = await branchRepository.findAll();
    allBranches.forEach(b => branchCache[b.name.toLowerCase()] = b.id);
    
    const allLocations = await locationRepository.findAll();
    allLocations.forEach(l => locCache[`${l.branch_id}_${l.name.toLowerCase()}`] = l.id);

    const allDepts = await departmentRepository.findAll();
    allDepts.forEach(d => deptCache[d.name.toLowerCase()] = d.id);

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      const name = row['CLINICIAN']?.toString().trim();
      let empId = row['EMPLOYEE ID']?.toString().trim();
      const designation = row['TITLE / DESIGNATION']?.toString().trim();
      const departmentName = row['DEPARTMENTS']?.toString().trim();
      const branchName = row['BRANCHES']?.toString().trim();
      const locationName = row['LOCATIONS']?.toString().trim();

      if (!name || !empId || !designation || !departmentName || !branchName || !locationName) {
        errorCount++;
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
      if (!branchId) { errorCount++; continue; }

      const locId = locCache[`${branchId}_${locationName.toLowerCase()}`];
      if (!locId) { errorCount++; continue; }

      const deptId = deptCache[departmentName.toLowerCase()];
      if (!deptId) { errorCount++; continue; }

      if (!doctorsMap.has(empId)) {
        doctorsMap.set(empId, {
          employee_id: empId,
          name: formattedName,
          designation,
          status: 1, // Default active
          assignments: []
        });
      }

      const doc = doctorsMap.get(empId);
      // Avoid duplicate assignments for same doctor
      const exists = doc.assignments.find(a => a.branch_id === branchId && a.location_id === locId && a.department_id === deptId);
      if (!exists) {
        doc.assignments.push({ branch_id: branchId, location_id: locId, department_id: deptId });
      }
    }

    // Process grouped doctors
    for (const [empId, docData] of doctorsMap.entries()) {
      if (docData.assignments.length === 0) continue;
      
      // Check if exists
      const existing = await doctorRepository.findByEmployeeId(empId);
      if (existing) {
        // Update existing, maintaining their photo if any
        await doctorRepository.update(existing.id, {
          employee_id: docData.employee_id,
          name: docData.name,
          designation: docData.designation,
          status: docData.status,
          photo_url: existing.photo_url,
          assignments: docData.assignments
        });
      } else {
        // Create new
        await doctorRepository.create(docData);
      }
      successCount++;
    }

    notifyUpdate();

    return res.status(200).json({ 
      message: `Bulk upload completed. Processed ${successCount} doctors. Skipped/failed ${errorCount} rows due to missing/invalid master data.`
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
