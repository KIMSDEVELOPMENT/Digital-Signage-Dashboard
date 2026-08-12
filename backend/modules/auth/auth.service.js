/**
 * modules/auth/auth.service.js
 *
 * Business logic layer for authentication.
 * JWT creation, validation, password hashing — extracted from the controller.
 * Currently delegates to the existing controller implementation.
 * Ready to receive extracted logic when the team decides to fully migrate.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey12345!';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

/**
 * Generates a signed JWT for an authenticated user.
 * @param {{ id: number, username: string, role: string }} user
 * @returns {string} signed JWT
 */
export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

/**
 * Verifies a password against its bcrypt hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const verifyPassword = (plain, hash) => bcrypt.compare(plain.trim(), hash);

/**
 * Hashes a password with bcrypt.
 * @param {string} plain
 * @returns {Promise<string>}
 */
export const hashPassword = (plain) => bcrypt.hash(plain.trim(), 10);
