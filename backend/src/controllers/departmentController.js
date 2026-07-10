import departmentRepository from '../repositories/DepartmentRepository.js';

export async function getDepartments(req, res) {
  try {
    const departments =
      req.user.role === 'normal_admin'
        ? await departmentRepository.findByUserId(req.user.id)
        : await departmentRepository.findAll();

    return res.status(200).json(departments.map((d) => d.toPublic()));
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createDepartment(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  try {
    const existing = await departmentRepository.findByName(name.trim());
    if (existing) {
      return res.status(400).json({ message: 'Department already exists.' });
    }

    const id = await departmentRepository.create(name.trim());
    return res.status(201).json({ id, name: name.trim() });
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
