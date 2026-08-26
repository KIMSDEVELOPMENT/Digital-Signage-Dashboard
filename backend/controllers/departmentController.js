import departmentRepository from '../repositories/DepartmentRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import { notifyUpdate } from '../utils/sse.js';
import { getPool } from '../config/db.js';

export async function getDepartments(req, res) {
  try {
    const { page, limit, search, sortBy, sortOrder, branch, branch_id, location_id, status } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : (branch ? branch : null);
    const parsedLocationId = location_id ? parseInt(location_id, 10) : null;
    const parsedStatus = status !== undefined ? parseInt(status, 10) : null;

    // Determine role-based filtering from the verified JWT (req.user), NOT from query params
    const isNormalAdmin = req.user && req.user.role === 'normal_admin';

    // If no pagination params provided, return full active list (backwards compatible)
    if (!page) {
      // For normal_admin: return only departments from their assigned locations
      if (isNormalAdmin) {
        const departments = await departmentRepository.findByUserId(req.user.id, parsedBranchId, parsedLocationId);
        return res.status(200).json(departments.map((d) => d.toPublic()));
      }
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
      // Scope to user's assigned departments/locations for normal_admin (from JWT, not query)
      userId: isNormalAdmin ? req.user.id : null,
      role: isNormalAdmin ? 'normal_admin' : 'super_admin',
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
  if (req.user && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admin can add departments.' });
  }

  let { name, branch_id, location_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  name = name.trim().toUpperCase();

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
  let { name, branch_id, location_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  name = name.trim().toUpperCase();

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
  if (req.user && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admin can delete departments.' });
  }

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
export async function getDepartmentDesignations(req, res) {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, designation, sort_order FROM department_designations WHERE department_id = ? ORDER BY sort_order ASC',
      [id]
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get designations error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateDepartmentDesignations(req, res) {
  const { id } = req.params;
  const { designations } = req.body;
  try {
    const pool = getPool();
    await pool.query('DELETE FROM department_designations WHERE department_id = ?', [id]);

    if (designations && designations.length > 0) {
      for (let i = 0; i < designations.length; i++) {
        await pool.query(
          'INSERT INTO department_designations (department_id, designation, sort_order) VALUES (?, ?, ?)',
          [id, designations[i], i + 1]
        );
      }
    }
    return res.status(200).json({ message: 'Designations updated successfully.' });
  } catch (error) {
    console.error('Update designations error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getDoctorsOrder(req, res) {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT d.id AS doctor_id, d.name, d.designation, da.display_order
       FROM doctor_assignments da
       JOIN doctors d ON da.doctor_id = d.id
       LEFT JOIN department_designations dd ON dd.department_id = da.department_id
            AND UPPER(dd.designation) = UPPER(d.designation)
       WHERE da.department_id = ?
       ORDER BY COALESCE(dd.sort_order, 99) ASC, da.display_order ASC, d.name ASC`,
      [id]
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get doctors order error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateDoctorsOrder(req, res) {
  const { id } = req.params;
  const { orders } = req.body; // [{ doctor_id, display_order }]
  try {
    const pool = getPool();
    if (orders && orders.length > 0) {
      for (const item of orders) {
        await pool.query(
          'UPDATE doctor_assignments SET display_order = ? WHERE department_id = ? AND doctor_id = ?',
          [item.display_order, id, item.doctor_id]
        );
      }
    }
    notifyUpdate();
    return res.status(200).json({ message: 'Doctor display order updated successfully.' });
  } catch (error) {
    console.error('Update doctors order error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
