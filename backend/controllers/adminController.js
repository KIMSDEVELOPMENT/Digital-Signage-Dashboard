import bcrypt from 'bcrypt';
import userRepository from '../repositories/UserRepository.js';
import { getUserPermissions } from '../middleware/permission.js';

const MODULES = ['Department', 'Doctor', 'Duty Roster', 'Display Screen', 'Reports'];

export async function getAdmins(req, res) {
  try {
    const admins = await userRepository.findAdmins(req.query.search || null);
    return res.status(200).json(admins.map((a) => a.toPublic()));
  } catch (error) {
    console.error('Get admins error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function createAdmin(req, res) {
  const { employee_id, full_name, username, password, default_branch, default_location } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({ message: 'Full name, username, and password are required.' });
  }

  try {
    const usernameTaken = await userRepository.isUsernameTaken(username.trim());
    if (usernameTaken) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    if (employee_id) {
      const empTaken = await userRepository.isEmployeeIdTaken(employee_id.trim());
      if (empTaken) {
        return res.status(400).json({ message: 'An admin with this Employee ID already exists.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const newUserId = await userRepository.createAdmin({
      employee_id: employee_id?.trim() || null,
      full_name: full_name.trim(),
      username: username.trim(),
      hashedPassword,
    });

    if (default_branch) {
      await userRepository.addUserBranch(newUserId, default_branch);
      if (default_location) {
        await userRepository.addUserLocation(newUserId, default_branch, default_location);
      }
    }

    await userRepository.seedDefaultPermissions(newUserId, MODULES);

    return res.status(201).json({
      id: newUserId,
      employee_id: employee_id?.trim() || null,
      full_name: full_name.trim(),
      username: username.trim(),
      role: 'normal_admin',
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteAdmin(req, res) {
  const { id } = req.params;

  try {
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    if (user.role !== 'normal_admin') {
      return res.status(403).json({ message: 'Cannot delete Super Admin.' });
    }

    await userRepository.deleteById(id);
    return res.status(200).json({ message: 'Admin deleted successfully.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function resetPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || !password.trim()) {
    return res.status(400).json({ message: 'Password is required.' });
  }

  try {
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    await userRepository.updatePassword(id, hashedPassword);

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getAdminPermissions(req, res) {
  const { id } = req.params;
  try {
    const admin = await userRepository.findAdminById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const permissions = await getUserPermissions(Number(id), 'normal_admin');

    return res.status(200).json({ admin: admin.toPublic(), permissions });
  } catch (error) {
    console.error('Get admin permissions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function updateAdminPermissions(req, res) {
  const { id } = req.params;
  const { branches, locations, departments, modules } = req.body;

  try {
    const admin = await userRepository.findAdminById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    await userRepository.updateAdminPermissions(id, { branches, locations, departments, modules });
    return res.status(200).json({ message: 'Permissions updated successfully.' });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
