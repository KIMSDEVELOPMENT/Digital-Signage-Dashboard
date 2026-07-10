import xlsx from 'xlsx';
import fs from 'fs';
import doctorRepository from '../repositories/DoctorRepository.js';
import rosterRepository from '../repositories/RosterRepository.js';
import userRepository from '../repositories/UserRepository.js';

export async function previewRoster(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    fs.unlinkSync(req.file.path);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty.' });
    }

    let allowedBranches = null;
    if (req.user.role === 'normal_admin') {
      allowedBranches = await userRepository.getUserBranches(req.user.id);
    }

    const previewData = [];

    for (const row of data) {
      const keys = Object.keys(row);
      const empIdKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'employeeid');
      const timingKey = keys.find(
        (k) =>
          k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'timing' ||
          k.toLowerCase() === 'time' ||
          k.toLowerCase() === 'shift'
      );

      const rawEmployeeId = empIdKey ? String(row[empIdKey]).trim() : '';
      const rawTiming = timingKey ? String(row[timingKey]).trim() : '';

      if (!rawEmployeeId) {
        previewData.push({
          employee_id: '', timing: rawTiming, doctor_name: 'N/A',
          department_name: 'N/A', branch: 'N/A', location: 'N/A',
          status: 'error', error_message: 'Missing Employee ID in row.',
        });
        continue;
      }

      const doctor = await doctorRepository.findByEmployeeId(rawEmployeeId);

      if (!doctor) {
        previewData.push({
          employee_id: rawEmployeeId, timing: rawTiming,
          doctor_name: 'Unknown', department_name: 'Unknown',
          branch: 'Unknown', location: 'Unknown',
          status: 'error', error_message: `Employee ID "${rawEmployeeId}" not found in database.`,
        });
      } else {
        if (allowedBranches && !allowedBranches.includes(doctor.branch)) {
          previewData.push({
            employee_id: rawEmployeeId, timing: rawTiming,
            doctor_name: doctor.name, department_name: doctor.department_name,
            branch: doctor.branch, location: doctor.location,
            status: 'error',
            error_message: `Unauthorized. Doctor belongs to branch ${doctor.branch}, outside your assigned branches.`,
          });
          continue;
        }
        previewData.push({
          employee_id: rawEmployeeId, timing: rawTiming || 'Not Scheduled',
          doctor_name: doctor.name, department_name: doctor.department_name,
          branch: doctor.branch, location: doctor.location, status: 'success',
        });
      }
    }

    return res.status(200).json(previewData);
  } catch (error) {
    console.error('Preview roster error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Error processing Excel file.' });
  }
}

export async function importRoster(req, res) {
  const { roster } = req.body;

  if (!roster || !Array.isArray(roster) || roster.length === 0) {
    return res.status(400).json({ message: 'Roster data is required.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    let allowedBranches = null;
    if (req.user.role === 'normal_admin') {
      allowedBranches = await userRepository.getUserBranches(req.user.id);
    }

    const validEntries = [];
    const missingEmployees = [];
    const unauthorizedEmployees = [];

    for (const item of roster) {
      const doctor = await doctorRepository.findByEmployeeId(item.employee_id);

      if (!doctor) {
        missingEmployees.push(item.employee_id);
      } else {
        if (allowedBranches && !allowedBranches.includes(doctor.branch)) {
          unauthorizedEmployees.push(doctor.name);
          continue;
        }
        validEntries.push({
          employee_id: item.employee_id,
          timing: item.timing || 'Not Scheduled',
          branch: doctor.branch,
          location: doctor.location,
        });
      }
    }

    if (missingEmployees.length > 0) {
      return res.status(400).json({
        message: `Import aborted. Employee ID(s) not found: ${missingEmployees.join(', ')}`,
      });
    }

    if (unauthorizedEmployees.length > 0) {
      return res.status(403).json({
        message: `Import aborted. No branch permission for: ${unauthorizedEmployees.join(', ')}`,
      });
    }

    await rosterRepository.importRoster(validEntries, today);
    return res.status(200).json({ message: "Today's roster imported successfully." });
  } catch (error) {
    console.error('Import roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getTodayRoster(req, res) {
  const { branch, location } = req.query;

  if (!branch) {
    return res.status(400).json({ message: 'Branch is required.' });
  }

  if (req.user && req.user.role === 'normal_admin') {
    const hasAccess = await userRepository.hasBranchAccess(req.user.id, branch);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this branch.' });
    }
  }

  try {
    const roster = await rosterRepository.findTodayRoster({ branch, location: location || null });
    return res.status(200).json(roster.map((r) => r.toPublic()));
  } catch (error) {
    console.error('Get today roster error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
