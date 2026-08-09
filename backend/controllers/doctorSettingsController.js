import sittingRepository from '../repositories/SittingRepository.js';
import doctorRepository from '../repositories/DoctorRepository.js';
import userRepository from '../repositories/UserRepository.js';

export const searchDoctors = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    const doctors = await sittingRepository.searchDoctors(query);
    res.json(doctors);
  } catch (error) {
    console.error('Error searching doctors for sittings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const saveSitting = async (req, res) => {
  try {
    const { employee_id, branch_id, location_id, display_days } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'employee_id is required' });
    }
    if (!branch_id || !location_id) {
      return res.status(400).json({ message: 'branch_id and location_id are required' });
    }
    
    if (typeof display_days !== 'object' || display_days === null) {
      return res.status(400).json({ message: 'display_days must be an object or array' });
    }

    const doctor = await doctorRepository.findByEmployeeId(employee_id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const parsedBranchId = parseInt(branch_id, 10);
    const parsedLocationId = parseInt(location_id, 10);
    const selectedAssignment = (doctor.assignments || []).find(
      (assignment) => Number(assignment.branch_id) === parsedBranchId && Number(assignment.location_id) === parsedLocationId
    );

    if (!selectedAssignment) {
      return res.status(400).json({ message: 'Selected branch/location is not assigned to this doctor' });
    }

    if (req.user?.role !== 'super_admin') {
      const hasAccess = await userRepository.hasLocationAccess(
        req.user.id,
        selectedAssignment.branch_name,
        selectedAssignment.location_name
      );
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to configure availability for this location' });
      }
    }

    await sittingRepository.upsertSitting(employee_id, parsedBranchId, parsedLocationId, display_days);
    
    res.json({ message: 'Settings configuration saved successfully' });
  } catch (error) {
    console.error('Error saving settings configuration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
