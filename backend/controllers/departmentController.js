import departmentRepository from '../repositories/DepartmentRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import { notifyUpdate } from '../utils/sse.js';

export async function getDepartments(req, res) {
  try {
    const { page, limit, search, sortBy, sortOrder, branch, branch_id, location_id, status } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : (branch ? branch : null);
    const parsedLocationId = location_id ? parseInt(location_id, 10) : null;
    const parsedStatus = status !== undefined ? parseInt(status, 10) : null;

    // If no pagination params provided, return full active list (backwards compatible)
    if (!page) {
      const departments = await departmentRepository.findAll(parsedBranchId, parsedLocationId, parsedStatus);

      return res.status(200).json(departments.map((d) => d.toPublic()));
    }

    // Paginated response
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const { data, totalRecords } = await departmentRepository.findPaginated({
      page: pageNum,
      limit: limitNum,
      search: search || '',
      branchId: parsedBranchId,
      locationId: parsedLocationId,
      status: parsedStatus,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
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
    console.error('Get departments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createDepartment(req, res) {
  const { name, branch_id, location_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (!branch_id) {
    return res.status(400).json({ message: 'Branch selection is required.' });
  }

  if (!location_id) {
    return res.status(400).json({ message: 'Location selection is required.' });
  }

  try {
    const branch = await branchRepository.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'Selected branch does not exist.' });
    }

    const location = await locationRepository.findById(location_id);
    if (!location) {
      return res.status(400).json({ message: 'Selected location does not exist.' });
    }

    const existing = await departmentRepository.findByNameAndBranchLocation(name.trim(), branch_id, location_id);
    if (existing) {
      return res.status(400).json({ message: 'Department already exists under this branch and location.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    const id = await departmentRepository.create({
      name: name.trim(),
      branch_id,
      location_id,
      status: parsedStatus
    });

    notifyUpdate();

    return res.status(201).json({
      id,
      name: name.trim(),
      branch_id,
      location_id,
      status: !!parsedStatus
    });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, branch_id, location_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (!branch_id) {
    return res.status(400).json({ message: 'Branch selection is required.' });
  }

  if (!location_id) {
    return res.status(400).json({ message: 'Location selection is required.' });
  }

  try {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const branch = await branchRepository.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'Selected branch does not exist.' });
    }

    const location = await locationRepository.findById(location_id);
    if (!location) {
      return res.status(400).json({ message: 'Selected location does not exist.' });
    }

    const existing = await departmentRepository.findByNameAndBranchLocation(name.trim(), branch_id, location_id);
    if (existing && existing.id !== parseInt(id, 10)) {
      return res.status(400).json({ message: 'Department already exists under this branch and location.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    await departmentRepository.update(id, {
      name: name.trim(),
      branch_id,
      location_id,
      status: parsedStatus
    });

    notifyUpdate();

    return res.status(200).json({
      id,
      name: name.trim(),
      branch_id,
      location_id,
      status: !!parsedStatus
    });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteDepartment(req, res) {
  const { id } = req.params;

  try {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const hasDoctors = await departmentRepository.hasDoctors(id);
    if (hasDoctors) {
      return res.status(400).json({
        message: 'Cannot delete department. There are doctors assigned to this department.',
      });
    }

    const affected = await departmentRepository.deleteById(id);
    if (affected === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    notifyUpdate();

    return res.status(200).json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
