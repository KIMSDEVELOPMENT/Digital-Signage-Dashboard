import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializePool } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security and utility middleware ───────────────────────────────────────────
// app.use(helmet()); // Disabled for local HTTP deployment over IP to prevent HTTPS forcing and COOP issues
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// ── Static uploads folder ─────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Auto-load modules ─────────────────────────────────────────────────────────
// Each module exports a default router and a BASE_PATH constant.
// To add a new feature: create a module folder and export BASE_PATH from its routes file.
// No changes needed here.

const MODULE_ROUTES = [
  () => import('./modules/auth/auth.routes.js'),
  () => import('./modules/branch/branch.routes.js'),
  () => import('./modules/location/location.routes.js'),
  () => import('./modules/department/department.routes.js'),
  () => import('./modules/doctor/doctor.routes.js'),
  () => import('./modules/roster/roster.routes.js'),
  () => import('./modules/display/display.routes.js'),
  () => import('./modules/video/video.routes.js'),
  () => import('./modules/settings/settings.routes.js'),
  () => import('./modules/settings/admin.routes.js'),
  () => import('./modules/doctor-settings/doctorSettings.routes.js'),
  () => import('./modules/config/config.routes.js'),
];

const loadModules = async () => {
  for (const loader of MODULE_ROUTES) {
    const mod = await loader();
    app.use(`/api/${mod.BASE_PATH}`, mod.default);
  }
};

// ── Centralized error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred.',
  });
});

// ── Initialize DB pool → load modules → start server ─────────────────────────
(async () => {
  try {
    await initializePool();
    await loadModules();

    // ── Serve React Frontend ──────────────────────────────────────────────────────
    app.use(express.static(path.join(__dirname, 'dist')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
})();
