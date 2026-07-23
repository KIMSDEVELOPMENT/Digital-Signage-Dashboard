import branchRepository from '../repositories/BranchRepository.js';
import { notifyUpdate } from '../utils/sse.js';

export async function getBranches(req, res) {
  try {
    const { page, limit, search, sortBy, sortOrder, status } = req.query;

    // If no pagination params are provided, return full list
    if (!page) {
      const parsedStatus = status !== undefined ? parseInt(status, 10) : null;
      const branches = await branchRepository.findAll(parsedStatus);
      return res.status(200).json(branches.map((b) => b.toPublic()));
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const { data, totalRecords } = await branchRepository.findPaginated({
      page: pageNum,
      limit: limitNum,
      search: search || '',
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
    });

    const totalPages = Math.ceil(totalRecords / limitNum);

    return res.status(200).json({
      success: true,
      data: data.map((b) => b.toPublic()),
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
    console.error('Get branches error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getBranchById(req, res) {
  const { id } = req.params;
  try {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }
    return res.status(200).json(branch.toPublic());
  } catch (error) {
    console.error('Get branch by ID error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createBranch(req, res) {
  let { name, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Branch name is required.' });
  }

  name = name.trim().toUpperCase();

  try {
    const existing = await branchRepository.findByName(name.trim());
    if (existing) {
      return res.status(400).json({ message: 'Branch already exists.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    const id = await branchRepository.create({ name: name.trim(), status: parsedStatus });
    notifyUpdate();
    return res.status(201).json({ id, name: name.trim(), status: !!parsedStatus });
  } catch (error) {
    console.error('Create branch error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateBranch(req, res) {
  const { id } = req.params;
  let { name, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Branch name is required.' });
  }

  name = name.trim().toUpperCase();

  try {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    // Check if name is taken by another branch
    const existing = await branchRepository.findByName(name.trim());
    if (existing && existing.id !== parseInt(id, 10)) {
      return res.status(400).json({ message: 'Branch name is already taken.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    await branchRepository.update(id, { name: name.trim(), status: parsedStatus });
    notifyUpdate();
    return res.status(200).json({ id, name: name.trim(), status: !!parsedStatus });
  } catch (error) {
    console.error('Update branch error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteBranch(req, res) {
  const { id } = req.params;
  try {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    const hasDeps = await branchRepository.hasDependencies(id);
    if (hasDeps) {
      return res.status(400).json({
        message: 'Cannot delete branch. It has locations, departments, or doctors assigned to it.',
      });
    }

    await branchRepository.deleteById(id);
    notifyUpdate();
    return res.status(200).json({ message: 'Branch deleted successfully.' });
  } catch (error) {
    console.error('Delete branch error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
