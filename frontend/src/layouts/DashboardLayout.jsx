import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../app/context/AuthContext';
import BottomFooter from '../common/components/BottomFooter';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  ShieldAlert, 
  CalendarDays, 
  MonitorPlay, 
  LogOut, 
  Menu, 
  X,
  User,
  Settings,
  Layers
} from 'lucide-react';
import logoImg from '../common/assets/kims-logo.png';

const DashboardLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build menu items dynamically based on permissions
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      visible: true, // Always visible for logged in users
    },
    {
      name: 'Doctors Directory',
      path: '/doctors',
      icon: Users,
      visible: hasPermission('Doctor', 'read'),
    },
    {
      name: 'Duty Roster',
      path: '/roster',
      icon: CalendarDays,
      visible: hasPermission('Duty Roster', 'read'),
    },
  ];

  // Super Admin only menu items
  const adminMenuItems = [
    {
      name: 'Branch Master',
      path: '/branches',
      icon: Building2,
      visible: user?.role === 'super_admin',
    },
    {
      name: 'Location Master',
      path: '/locations',
      icon: Building2,
      visible: user?.role === 'super_admin',
    },
    {
      name: 'Department Master',
      path: '/departments',
      icon: Layers,
      visible: hasPermission('Department', 'read'),
    },
    {
      name: 'Admin Users',
      path: '/admins',
      icon: ShieldAlert,
      visible: user?.role === 'super_admin',
    },
    {
      name: 'Admin Config',
      path: '/admin-config',
      icon: Settings,
      visible: user?.role === 'super_admin',
    },
  ];

  const filteredMenuItems = menuItems.filter(item => item.visible);
  const filteredAdminItems = adminMenuItems.filter(item => item.visible);

  // Display screen link for users with that permission
  const showDisplayScreen = hasPermission('Display Screen', 'read');

  // Build a summary label for the user
  const getUserLabel = () => {
    if (user?.role === 'super_admin') return 'Super Admin';
    const branches = user?.permissions?.branches;
    if (branches && branches.length > 0) {
      return branches.join(', ');
    }
    return 'Normal Admin';
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-slate-800/50 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/40">
          <img src={logoImg} alt="KIMS Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-heading font-bold text-sm tracking-tight text-emerald-400">KIMS HOSPITAL</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider">DIGITAL SIGNAGE</p>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Main menu */}
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase px-4 mb-2">Main</p>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-250 group
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'}
                `}
              >
                <Icon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Display screen link */}
          {showDisplayScreen && (
            <Link
              to="/display"
              target="_blank"
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent transition-all duration-250 group"
            >
              <MonitorPlay className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-300 group-hover:scale-105" />
              Display Screen
            </Link>
          )}

          {/* Admin section */}
          {filteredAdminItems.length > 0 && (
            <>
              <div className="h-px bg-slate-800/40 my-4" />
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase px-4 mb-2">Administration</p>
              {filteredAdminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-250 group
                      ${isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'}
                    `}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/40 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/30 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-slate-400 font-medium capitalize truncate">
                {getUserLabel()}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all font-medium text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 lg:hidden flex items-center justify-between px-6 border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="KIMS Logo" className="w-8 h-8 object-contain" />
            <span className="font-heading font-bold text-sm tracking-tight text-emerald-400">KIMS Signage</span>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 border-b border-slate-800/30 bg-slate-950/20">
          <div>
            <h2 className="text-xl font-heading font-bold text-white">
              {location.pathname === '/' && 'Welcome back, ' + (user?.full_name || 'Admin')}
              {location.pathname === '/departments' && 'Hospital Departments'}
              {location.pathname === '/doctors' && 'Doctors Directory'}
              {location.pathname === '/admins' && 'System Administrators'}
              {location.pathname === '/admin-config' && 'Admin Configuration'}
              {location.pathname === '/roster' && 'Duty Roster Management'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {location.pathname === '/' && 'Monitor digital signage and departments overview.'}
              {location.pathname === '/departments' && 'Configure and manage active clinical divisions.'}
              {location.pathname === '/doctors' && 'Add and manage doctor profiles and locations.'}
              {location.pathname === '/admins' && 'Admin credentials, branches, and area assignments.'}
              {location.pathname === '/admin-config' && 'Configure permissions for admin users.'}
              {location.pathname === '/roster' && 'Preview and upload shift schedules for today.'}
            </p>
          </div>

          {user?.role === 'normal_admin' && (
            <div className="px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-emerald-400 text-xs font-semibold">
              {getUserLabel()}
            </div>
          )}
        </header>

        {/* Dashboard Pages Root */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
        <BottomFooter />
      </div>
    </div>
  );
};

export default DashboardLayout;
