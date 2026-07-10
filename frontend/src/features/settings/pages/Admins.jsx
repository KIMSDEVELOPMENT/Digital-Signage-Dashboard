import React, { useState, useEffect } from 'react';
import api from '../../../common/services/api';
import { BRANCH_LOCATIONS, BRANCHES } from '../../../common/utils';
import { Plus, Trash2, Search, Key, ShieldAlert, User } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import Modal from '../../../common/components/Modal';
import { toast } from 'react-hot-toast';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    password: '',
    default_branch: '',
    default_location: '',
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admins');
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load administrators.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleBranchChange = (e) => {
    setFormData({
      ...formData,
      default_branch: e.target.value,
      default_location: '', // Reset location
    });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const { employee_id, full_name, username, password, default_branch, default_location } = formData;

    if (!employee_id || !full_name || !username || !password || !default_branch || !default_location) {
      toast.error('All fields are required.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading('Creating administrator user...');
    try {
      const res = await api.post('/admins', {
        employee_id,
        full_name,
        username,
        password,
        default_branch,
        default_location
      });
      toast.success('Admin created successfully!', { id: loadToast });
      setAdmins([...admins, res.data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setIsCreateOpen(false);
      setFormData({
        employee_id: '',
        full_name: '',
        username: '',
        password: '',
        default_branch: '',
        default_location: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating admin.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete administrator "${name}"?`)) return;

    const loadToast = toast.loading('Deleting administrator...');
    try {
      await api.delete(`/admins/${id}`);
      toast.success('Admin user deleted successfully!', { id: loadToast });
      setAdmins(admins.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting admin.', { id: loadToast });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordVal.trim()) return;

    setSubmitting(true);
    const loadToast = toast.loading(`Resetting password for ${selectedAdmin.username}...`);
    try {
      await api.post(`/admins/${selectedAdmin.id}/reset-password`, { password: resetPasswordVal });
      toast.success('Password updated successfully!', { id: loadToast });
      setIsResetOpen(false);
      setResetPasswordVal('');
      setSelectedAdmin(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resetting password.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter((a) =>
    (a.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search admins by name, ID, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5 self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Admin
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/30 text-sm">
                {filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-300">{admin.employee_id}</td>
                      <td className="px-6 py-4 font-semibold text-white">{admin.full_name}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{admin.username}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setIsResetOpen(true);
                          }}
                          className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        {/* Delete Admin */}
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.full_name)}
                          className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                          title="Delete Admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No administrators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormData({
            employee_id: '',
            full_name: '',
            username: '',
            password: '',
            default_branch: '',
            default_location: '',
          });
        }}
        title="Create Normal Administrator"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="flex items-center gap-2.5 p-3.5 border border-amber-500/25 bg-amber-500/5 rounded-xl text-amber-400 text-xs font-medium mb-2 leading-relaxed">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
            Super Admin must configure specific locations, departments, and module-level permissions for this admin in the Config Module.
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">EMPLOYEE ID *</label>
              <input
                type="text"
                placeholder="e.g. EMP123"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">FULL NAME *</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ADMIN USERNAME *</label>
              <input
                type="text"
                placeholder="e.g. johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">PASSWORD *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DEFAULT BRANCH *</label>
              <select
                value={formData.default_branch}
                onChange={handleBranchChange}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
              >
                <option value="">Select Branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DEFAULT LOCATION *</label>
              <select
                value={formData.default_location}
                disabled={!formData.default_branch}
                onChange={(e) => setFormData({ ...formData, default_location: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">Select Location</option>
                {formData.default_branch &&
                  BRANCH_LOCATIONS[formData.default_branch].map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setFormData({
                  employee_id: '',
                  full_name: '',
                  username: '',
                  password: '',
                  default_branch: '',
                  default_location: '',
                });
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5"
            >
              Save Admin
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => {
          setIsResetOpen(false);
          setResetPasswordVal('');
          setSelectedAdmin(null);
        }}
        title={`Reset Password for ${selectedAdmin?.username}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">NEW PASSWORD</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => {
                setIsResetOpen(false);
                setResetPasswordVal('');
                setSelectedAdmin(null);
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !resetPasswordVal.trim()}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Admins;
