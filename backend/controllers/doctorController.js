import fs from 'fs';
import path from 'path';
import doctorRepository from '../repositories/DoctorRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import userRepository from '../repositories/UserRepository.js';

export async function getDoctors(req, res) {
  try {
    const { search, branch, branch_id, location_id, department_id, page, limit, sortBy, sortOrder } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;
    const parsedLocationId = location_id ? parseInt(location_id, 10) : null;

    if (!page) {
      if (req.user.role === 'normal_admin') {
        const branches = await userRepository.getUserBranches(req.user.id);
        const locations = await userRepository.getUserLocations(req.user.id);
        const departmentIds = await userRepository.getUserDepartmentIds(req.user.id);

        const doctors = await doctorRepository.findWithFilters({
          branches,
          locations,
          departmentIds,
          search: search || null,
        });

        return res.status(200).json(doctors.map((d) => d.toPublic()));
      }

      const doctors = await doctorRepository.findWithFilters({
        branches: branch ? [branch] : (parsedBranchId ? [parsedBranchId] : null),
        locations: null,
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

    if (req.user.role === 'normal_admin') {
      const userBranches = await userRepository.getUserBranches(req.user.id);
      const userLocations = await userRepository.getUserLocations(req.user.id);
      const userDepartmentIds = await userRepository.getUserDepartmentIds(req.user.id);

      paginationParams.branches = userBranches;
      paginationParams.locations = userLocations;
      paginationParams.departmentIds = userDepartmentIds;
    }

    if (branch) paginationParams.branchId = branch;
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
      const oldPath = path.join(process.cwd(), existing.photo_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
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

    return res.status(200).json({ message: 'Doctor deleted successfully.' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
