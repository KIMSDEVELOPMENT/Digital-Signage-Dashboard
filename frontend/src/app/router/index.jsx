import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, SuperAdminRoute, ModuleRoute } from './guards';
import DashboardLayout from '../../layouts/DashboardLayout';

// Lazy loading pages for optimized code splitting
const Login = lazy(() => import('../../features/authentication/pages/Login'));
const Dashboard = lazy(() => import('../../features/dashboard/pages/Dashboard'));
const Department = lazy(() => import('../../features/departments/pages/Department'));
const Doctor = lazy(() => import('../../features/doctors/pages/Doctor'));
const Branch = lazy(() => import('../../features/branches/pages/Branch'));
const Location = lazy(() => import('../../features/locations/pages/Location'));
const Admins = lazy(() => import('../../features/settings/pages/Admins'));
const AdminConfig = lazy(() => import('../../features/settings/pages/AdminConfig'));
const Roster = lazy(() => import('../../features/doctors/pages/Roster'));
const DisplayScreen = lazy(() => import('../../features/display/pages/DisplayScreen'));
const Error404 = lazy(() => import('../../features/error/Error404'));

// Loader spinner fallback
const PageLoader = () => (
  <div className="h-full min-h-[50vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/display" element={<DisplayScreen />} />
        <Route path="/display/:branch/:location" element={<DisplayScreen />} />

        {/* Protected Dashboard Routes (Shared by Super Admin and Normal Admin based on permissions) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            
            {/* Module Permission Controlled Routes */}
            <Route element={<ModuleRoute moduleName="Doctor" />}>
              <Route path="/doctors" element={<Doctor />} />
            </Route>
            <Route element={<ModuleRoute moduleName="Duty Roster" />}>
              <Route path="/roster" element={<Roster />} />
            </Route>
            <Route element={<ModuleRoute moduleName="Department" />}>
              <Route path="/departments" element={<Department />} />
            </Route>
            
            {/* Super Admin Only Routes */}
            <Route element={<SuperAdminRoute />}>
              <Route path="/branches" element={<Branch />} />
              <Route path="/locations" element={<Location />} />
              <Route path="/admins" element={<Admins />} />
              <Route path="/admin-config" element={<AdminConfig />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback 404 Route */}
        <Route path="/404" element={<Error404 />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
