import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import userRepository from '../repositories/UserRepository.js';
import { getUserPermissions } from '../middleware/permission.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey12345!';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

export async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = await userRepository.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password.trim(), user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const permissions = await getUserPermissions(user.id, user.role);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { ...user.toPublic(), permissions },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getMe(req, res) {
  try {
    const user = await userRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const permissions = await getUserPermissions(user.id, user.role);

    return res.status(200).json({ user: { ...user.toPublic(), permissions } });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
