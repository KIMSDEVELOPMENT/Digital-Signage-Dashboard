import locationRepository from '../repositories/LocationRepository.js';
import branchRepository from '../repositories/BranchRepository.js';

export async function getLocations(req, res) {
  try {
    const { page, limit, search, sortBy, sortOrder, status, branch_id } = req.query;

    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;
    const parsedStatus = status !== undefined ? parseInt(status, 10) : null;

    if (!page) {
      const locations = await locationRepository.findAll(parsedStatus, parsedBranchId);
      return res.status(200).json(locations.map((l) => l.toPublic()));
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const { data, totalRecords } = await locationRepository.findPaginated({
      page: pageNum,
      limit: limitNum,
      search: search || '',
      branchId: parsedBranchId,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
    });

    const totalPages = Math.ceil(totalRecords / limitNum);

    return res.status(200).json({
      success: true,
      data: data.map((l) => l.toPublic()),
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
    console.error('Get locations error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getLocationById(req, res) {
  const { id } = req.params;
  try {
    const location = await locationRepository.findById(id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }
    return res.status(200).json(location.toPublic());
  } catch (error) {
    console.error('Get location by ID error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createLocation(req, res) {
  const { name, branch_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Location name is required.' });
  }
  if (!branch_id) {
    return res.status(400).json({ message: 'Branch ID is required.' });
  }

  try {
    const branch = await branchRepository.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'Selected branch does not exist.' });
    }

    const existing = await locationRepository.findByNameAndBranch(name.trim(), branch_id);
    if (existing) {
      return res.status(400).json({ message: 'Location already exists under this branch.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    const id = await locationRepository.create({
      branch_id,
      name: name.trim(),
      status: parsedStatus,
    });
    return res.status(201).json({ id, branch_id, name: name.trim(), status: !!parsedStatus });
  } catch (error) {
    console.error('Create location error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateLocation(req, res) {
  const { id } = req.params;
  const { name, branch_id, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Location name is required.' });
  }
  if (!branch_id) {
    return res.status(400).json({ message: 'Branch ID is required.' });
  }

  try {
    const location = await locationRepository.findById(id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    const branch = await branchRepository.findById(branch_id);
    if (!branch) {
      return res.status(400).json({ message: 'Selected branch does not exist.' });
    }

    const existing = await locationRepository.findByNameAndBranch(name.trim(), branch_id);
    if (existing && existing.id !== parseInt(id, 10)) {
      return res.status(400).json({ message: 'Location name already exists under this branch.' });
    }

    const parsedStatus = status !== undefined ? (status ? 1 : 0) : 1;
    await locationRepository.update(id, {
      branch_id,
      name: name.trim(),
      status: parsedStatus,
    });
    return res.status(200).json({ id, branch_id, name: name.trim(), status: !!parsedStatus });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteLocation(req, res) {
  const { id } = req.params;
  try {
    const location = await locationRepository.findById(id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    const hasDeps = await locationRepository.hasDependencies(id);
    if (hasDeps) {
      return res.status(400).json({
        message: 'Cannot delete location. It has departments or doctors assigned to it.',
      });
    }

    await locationRepository.deleteById(id);
    return res.status(200).json({ message: 'Location deleted successfully.' });
  } catch (error) {
    console.error('Delete location error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
