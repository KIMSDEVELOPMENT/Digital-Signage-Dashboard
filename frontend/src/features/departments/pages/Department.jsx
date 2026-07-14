import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Building2 } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import Pagination from '../../../common/components/Pagination';
import { BRANCHES } from '../../../common/utils';
import { toast } from 'react-hot-toast';

const Department = () => {
  const { user, hasPermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBranch, setFilterBranch] = useState('');

  // Debounce timer ref
  const debounceRef = useRef(null);

  const fetchDepartments = useCallback(async (currentSearch) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (currentSearch) params.search = currentSearch;
      if (filterBranch) params.branch = filterBranch;

      const res = await api.get('/departments', { params });
      setDepartments(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterBranch]);

  // Fetch when page, limit, sort, or filter branch changes
  useEffect(() => {
    fetchDepartments(search);
  }, [page, limit, sortBy, sortOrder, filterBranch]);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1); // Reset to first page on new search
      fetchDepartments(value);
    }, 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when limit changes
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

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim() || !selectedBranch) return;

    setSubmitting(true);
    const loadToast = toast.loading('Creating department...');
    try {
      await api.post('/departments', { name: newDeptName.trim(), branch: selectedBranch });
      toast.success('Department created successfully!', { id: loadToast });
      setNewDeptName('');
      setSelectedBranch('');
      fetchDepartments(search);
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
      // If we deleted the last item on the current page, go back one page
      if (departments.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchDepartments(search);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting department.', { id: loadToast });
    }
  };

  const canCreate = hasPermission('Department', 'create');
  const canDelete = hasPermission('Department', 'delete');

  const allowedBranches = user?.role === 'super_admin' 
    ? BRANCHES 
    : (user?.permissions?.branches || []);

  const getSortIcon = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

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
              {/* Branch Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">SELECT BRANCH</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/60 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-350 cursor-pointer"
                >
                  <option value="" className="text-slate-500">Choose Branch</option>
                  {allowedBranches.map((b) => (
                    <option key={b} value={b} className="text-slate-300 bg-slate-950">{b}</option>
                  ))}
                </select>
              </div>

              {/* Department Name Input */}
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
                disabled={submitting || !newDeptName.trim() || !selectedBranch}
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
            <div className="flex flex-1 items-center gap-3 max-w-lg">
              {/* Search Input */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
                />
              </div>

              {/* Branch Filter Selector */}
              <div className="relative">
                <select
                  value={filterBranch}
                  onChange={(e) => {
                    setFilterBranch(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {allowedBranches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-semibold self-center">
              Total: {pagination?.totalRecords ?? 0} {(pagination?.totalRecords ?? 0) === 1 ? 'department' : 'departments'}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={3} />
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
                        Department Name{getSortIcon('name')}
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('branch')}
                      >
                        Branch{getSortIcon('branch')}
                      </th>
                      {canDelete && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/30 text-sm">
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <tr key={dept.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{dept.name}</td>
                          <td className="px-6 py-4 text-slate-300">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 text-xs font-semibold">
                              {dept.branch || 'Global'}
                            </span>
                          </td>
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
                        <td colSpan={canDelete ? 3 : 2} className="px-6 py-12 text-center text-slate-500 font-medium">
                          {search || filterBranch ? 'No departments match your search.' : 'No departments found. Create one to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Department;
