import sittingRepository from '../repositories/SittingRepository.js';

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
    const { employee_id, display_days } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'employee_id is required' });
    }
    
    if (!Array.isArray(display_days)) {
      return res.status(400).json({ message: 'display_days must be an array' });
    }

    await sittingRepository.upsertSitting(employee_id, display_days);
    
    res.json({ message: 'Sitting configuration saved successfully' });
  } catch (error) {
    console.error('Error saving sitting configuration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
