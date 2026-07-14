import departmentRepository from '../repositories/DepartmentRepository.js';

export async function getDepartments(req, res) {
  try {
    const { page, limit, search, sortBy, sortOrder, branch } = req.query;

    // If no pagination params provided, return full list (backwards compatible)
    if (!page) {
      const departments =
        req.user.role === 'normal_admin'
          ? await departmentRepository.findByUserId(req.user.id, branch || '')
          : await departmentRepository.findAll(branch || '');

      return res.status(200).json(departments.map((d) => d.toPublic()));
    }

    // Paginated response
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const { data, totalRecords } = await departmentRepository.findPaginated({
      page: pageNum,
      limit: limitNum,
      search: search || '',
      branch: branch || '',
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      userId: req.user.id,
      role: req.user.role,
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
  const { name, branch } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  if (!branch || !branch.trim()) {
    return res.status(400).json({ message: 'Branch is required.' });
  }

  try {
    const existing = await departmentRepository.findByName(name.trim());
    if (existing) {
      return res.status(400).json({ message: 'Department already exists.' });
    }

    const id = await departmentRepository.create(name.trim(), branch.trim());
    return res.status(201).json({ id, name: name.trim(), branch: branch.trim() });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteDepartment(req, res) {
  const { id } = req.params;

  try {
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

    return res.status(200).json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
