import fs from 'fs';
import path from 'path';
import doctorRepository from '../repositories/DoctorRepository.js';
import departmentRepository from '../repositories/DepartmentRepository.js';
import userRepository from '../repositories/UserRepository.js';

const VALID_BRANCH_LOCATIONS = {
  PBMH: ['A Block', 'B/C Block'],
  SSCC: ['KSS', 'KCC'],
  Dental: ['Dental'],
};

export async function getDoctors(req, res) {
  try {
    const { search, branch, location, department_id } = req.query;

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

    // Super admin — full filter support
    const doctors = await doctorRepository.findWithFilters({
      branches: branch ? [branch] : null,
      locations: location && branch ? [{ branch, location }] : null,
      departmentIds: department_id ? [department_id] : null,
      search: search || null,
    });

    return res.status(200).json(doctors.map((d) => d.toPublic()));
  } catch (error) {
    console.error('Get doctors error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createDoctor(req, res) {
  const { employee_id, name, designation, department_id, branch, location } = req.body;

  if (!employee_id || !name || !designation || !department_id || !branch || !location) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Doctor photo is required.' });
  }

  const photo_url = `/uploads/${req.file.filename}`;

  try {
    const department = await departmentRepository.findById(department_id);
    if (!department) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Selected department does not exist.' });
    }

    if (!VALID_BRANCH_LOCATIONS[branch] || !VALID_BRANCH_LOCATIONS[branch].includes(location)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid location for the selected branch.' });
    }

    const empTaken = await doctorRepository.isEmployeeIdTaken(employee_id);
    if (empTaken) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Doctor with this Employee ID already exists.' });
    }

    const id = await doctorRepository.create({ employee_id, name, designation, department_id, branch, location, photo_url });

    return res.status(201).json({ id, employee_id, name, designation, department_id, branch, location, photo_url });
  } catch (error) {
    console.error('Create doctor error:', error);
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

    const photoPath = path.join(process.cwd(), doctor.photo_url);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);

    return res.status(200).json({ message: 'Doctor deleted successfully.' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
