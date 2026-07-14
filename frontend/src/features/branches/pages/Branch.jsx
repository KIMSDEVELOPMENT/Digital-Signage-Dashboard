import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Building2, ToggleLeft, ToggleRight, Edit2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../../common/components/Pagination';
import { TableSkeleton } from '../../../common/components/Skeleton';

const Branch = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [branchStatus, setBranchStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef(null);

  const fetchBranches = useCallback(async (currentSearch) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (currentSearch) params.search = currentSearch;

      const res = await api.get('/branches', { params });
      setBranches(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load branches.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchBranches(search);
  }, [page, limit, sortBy, sortOrder]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchBranches(value);
    }, 400);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const resetForm = () => {
    setBranchName('');
    setBranchStatus(true);
    setEditingBranch(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) {
      toast.error('Branch name is required.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading(editingBranch ? 'Updating branch...' : 'Creating branch...');
    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, {
          name: branchName.trim(),
          status: branchStatus,
        });
        toast.success('Branch updated successfully!', { id: loadToast });
      } else {
        await api.post('/branches', {
          name: branchName.trim(),
          status: branchStatus,
        });
        toast.success('Branch created successfully!', { id: loadToast });
      }
      resetForm();
      fetchBranches(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing request.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchStatus(branch.status);
    setShowAddForm(true);
  };

  const handleToggleStatus = async (branch) => {
    const newStatus = !branch.status;
    const loadToast = toast.loading('Updating status...');
    try {
      await api.put(`/branches/${branch.id}`, {
        name: branch.name,
        status: newStatus,
      });
      toast.success(`Branch ${newStatus ? 'activated' : 'deactivated'} successfully!`, { id: loadToast });
      fetchBranches(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch status.', { id: loadToast });
    }
  };

  const handleDelete = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete the branch "${branch.name}"?`)) return;

    const loadToast = toast.loading('Deleting branch...');
    try {
      await api.delete(`/branches/${branch.id}`);
      toast.success('Branch deleted successfully!', { id: loadToast });
      setPage(1);
      fetchBranches(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete branch.', { id: loadToast });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-2xl text-white tracking-tight">Branch Master</h2>
          <p className="text-sm text-slate-400">Manage organization branch listings, active status, and network configuration.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create Branch
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Panel */}
        {showAddForm && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-white">
                {editingBranch ? 'Edit Branch' : 'Create Branch'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/55 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. KIMS Bhubaneswar"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Active Status
                </label>
                <button
                  type="button"
                  onClick={() => setBranchStatus(!branchStatus)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {branchStatus ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-500" />
                  )}
                  {branchStatus ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50"
                >
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 text-slate-300 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Branches List */}
        <div className={showAddForm ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search branches..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-semibold self-center">
              Total: {pagination?.totalRecords ?? 0} {(pagination?.totalRecords ?? 0) === 1 ? 'branch' : 'branches'}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('name')}
                      >
                        Branch Name{getSortIcon('name')}
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('status')}
                      >
                        Status{getSortIcon('status')}
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('created_at')}
                      >
                        Created Date{getSortIcon('created_at')}
                      </th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/30 text-sm">
                    {branches.length > 0 ? (
                      branches.map((branch) => (
                        <tr key={branch.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{branch.name}</td>
                          <td className="px-6 py-4 text-slate-300">
                            <button
                              onClick={() => handleToggleStatus(branch)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                branch.status
                                  ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                                  : 'bg-rose-500/5 border-rose-500/10 text-rose-400 hover:bg-rose-500/15'
                              }`}
                            >
                              {branch.status ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(branch.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(branch)}
                              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                              title="Edit Branch"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(branch)}
                              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Delete Branch"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                          {search ? 'No branches match your search.' : 'No branches found. Create one to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                pagination={pagination}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Branch;
