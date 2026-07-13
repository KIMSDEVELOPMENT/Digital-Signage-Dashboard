import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Building2 } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import { toast } from 'react-hot-toast';

const Department = () => {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setSubmitting(true);
    const loadToast = toast.loading('Creating department...');
    try {
      const res = await api.post('/departments', { name: newDeptName.trim() });
      toast.success('Department created successfully!', { id: loadToast });
      setDepartments([...departments, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDeptName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating department.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the department "${name}"?`)) return;

    const loadToast = toast.loading('Deleting department...');
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted successfully!', { id: loadToast });
      setDepartments(departments.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting department.', { id: loadToast });
    }
  };

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = hasPermission('Department', 'create');
  const canDelete = hasPermission('Department', 'delete');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Department Panel */}
        {canCreate ? (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 h-fit space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-800/30 pb-3">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-heading font-semibold text-white">Create Department</h3>
            </div>
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">DEPARTMENT NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Neurology"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/60 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !newDeptName.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5"
              >
                <Plus className="w-4.5 h-4.5" />
                Add Department
              </button>
            </form>
          </div>
        ) : null}

        {/* Departments List */}
        <div className={canCreate ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-semibold self-center">
              Total: {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Department Name</th>
                      {canDelete && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/30 text-sm">
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => (
                        <tr key={dept.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{dept.name}</td>
                          {canDelete && (
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Delete Department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={canDelete ? 2 : 1} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No departments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Department;
