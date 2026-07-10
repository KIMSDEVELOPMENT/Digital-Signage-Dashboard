import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rosterRoutes from './routes/rosterRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Essential to allow serving doctor images to client
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/roster', rosterRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Hospital Digital Signage API is running.' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred.',
  });
});

// Initialize database then start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
