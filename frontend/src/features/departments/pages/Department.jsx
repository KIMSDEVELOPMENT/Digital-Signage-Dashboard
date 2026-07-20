import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Building2, ToggleLeft, ToggleRight, Layers, Edit2, X } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import Pagination from '../../../common/components/Pagination';
import { toast } from 'react-hot-toast';

const Department = () => {
  const { user, hasPermission } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination & sorting states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Filter states
  const [filterBranch, setFilterBranch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [listLocations, setListLocations] = useState([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [deptStatus, setDeptStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef(null);

  // 1. Fetch dynamic masters for dropdowns
  const fetchMasters = useCallback(async () => {
    try {
      const branchesRes = await api.get('/branches?status=1');
      setBranches(branchesRes.data.data || branchesRes.data);

      const locationsRes = await api.get('/locations?status=1', { params: { limit: 1000 } });
      setLocations(locationsRes.data.data || locationsRes.data);
    } catch (err) {
      console.error('Error fetching masters:', err);
      toast.error('Failed to load branch/location configurations.');
    }
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  // Handle selected branch change in Create Form
  useEffect(() => {
    if (selectedBranch) {
      const filtered = locations.filter(l => l.branch_id === parseInt(selectedBranch, 10));
      setFilteredLocations(filtered);
      setSelectedLocation('');
    } else {
      setFilteredLocations([]);
      setSelectedLocation('');
    }
  }, [selectedBranch, locations]);

  // Handle branch filter change in List Filters
  useEffect(() => {
    if (filterBranch) {
      const filtered = locations.filter(l => l.branch_id === parseInt(filterBranch, 10));
      setListLocations(filtered);
      setFilterLocation('');
    } else {
      setListLocations([]);
      setFilterLocation('');
    }
  }, [filterBranch, locations]);

  // Fetch departments callback
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
      if (filterBranch) params.branch_id = filterBranch;
      if (filterLocation) params.location_id = filterLocation;

      const res = await api.get('/departments', { params });
      setDepartments(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation]);

  // Refetch when page, limit, sort, or filter changes
  useEffect(() => {
    fetchDepartments(search);
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchDepartments(value);
    }, 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
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

  const resetForm = () => {
    setNewDeptName('');
    setSelectedBranch('');
    setSelectedLocation('');
    setDeptStatus(true);
    setEditingDept(null);
    setShowAddForm(false);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim() || !selectedBranch || !selectedLocation) {
      toast.error('Please complete all form fields.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading(editingDept ? 'Updating department...' : 'Creating department...');
    try {
      const payload = {
        name: newDeptName.trim(),
        branch_id: parseInt(selectedBranch, 10),
        location_id: parseInt(selectedLocation, 10),
        status: deptStatus,
      };

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully!', { id: loadToast });
      } else {
        await api.post('/departments', payload);
        toast.success('Department created successfully!', { id: loadToast });
      }
      resetForm();
      fetchDepartments(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving department.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setNewDeptName(dept.name);
    setSelectedBranch(String(dept.branch_id));
    // Pre-populate location selection (useEffect handles filtering list)
    setTimeout(() => {
      setSelectedLocation(String(dept.location_id));
    }, 100);
    setDeptStatus(dept.status);
    setShowAddForm(true);
  };

  const handleToggleStatus = async (dept) => {
    const newStatus = !dept.status;
    const loadToast = toast.loading('Updating status...');
    try {
      await api.put(`/departments/${dept.id}`, {
        name: dept.name,
        branch_id: dept.branch_id,
        location_id: dept.location_id,
        status: newStatus,
      });
      toast.success(`Department ${newStatus ? 'activated' : 'deactivated'} successfully!`, { id: loadToast });
      fetchDepartments(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department status.', { id: loadToast });
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the department "${name}"?`)) return;

    const loadToast = toast.loading('Deleting department...');
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted successfully!', { id: loadToast });
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
  const canUpdate = hasPermission('Department', 'update');
  const canDelete = hasPermission('Department', 'delete');

  const getSortIcon = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-2xl text-white tracking-tight">Department Master</h2>
          <p className="text-sm text-slate-400">Configure organizational departments nested dynamically under specific branches and locations.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Panel */}
        {showAddForm && canCreate && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-white">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/55 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white cursor-pointer"
                >
                  <option value="">Choose a branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Location
                </label>
                <select
                  value={selectedLocation}
                  disabled={!selectedBranch}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedBranch ? 'Please choose a branch first...' : 'Choose a location...'}
                  </option>
                  {filteredLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Active Status
                </label>
                <button
                  type="button"
                  onClick={() => setDeptStatus(!deptStatus)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {deptStatus ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-500" />
                  )}
                  {deptStatus ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !newDeptName.trim() || !selectedBranch || !selectedLocation}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingDept ? 'Save Changes' : 'Create Department'}
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

        {/* Departments List */}
        <div className={(showAddForm && canCreate) ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Filter controls row */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
                />
              </div>

              {/* Branch Filter dropdown */}
              <select
                value={filterBranch}
                onChange={(e) => {
                  setFilterBranch(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Location Filter dropdown */}
              <select
                value={filterLocation}
                disabled={!filterBranch}
                onChange={(e) => {
                  setFilterLocation(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer disabled:opacity-40"
              >
                <option value="">
                  {!filterBranch ? 'Filter Location (Choose Branch)...' : 'All Locations'}
                </option>
                {listLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 font-semibold self-center">
              Total: {pagination?.totalRecords ?? 0} {(pagination?.totalRecords ?? 0) === 1 ? 'department' : 'departments'}
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={5} />
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
                        onClick={() => handleSort('branch_name')}
                      >
                        Branch{getSortIcon('branch_name')}
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('location_name')}
                      >
                        Location{getSortIcon('location_name')}
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                        onClick={() => handleSort('status')}
                      >
                        Status{getSortIcon('status')}
                      </th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/30 text-sm">
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <tr key={dept.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{dept.name}</td>
                          <td className="px-6 py-4 text-slate-300">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 text-xs font-semibold">
                              {dept.branch_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{dept.location_name}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleStatus(dept)}
                              disabled={!canUpdate}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                dept.status
                                  ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                                  : 'bg-rose-500/5 border-rose-500/10 text-rose-400 hover:bg-rose-500/15'
                              }`}
                            >
                              {dept.status ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {canUpdate && (
                              <button
                                onClick={() => handleEdit(dept)}
                                className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                                title="Edit Department"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Delete Department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                          {search || filterBranch || filterLocation
                            ? 'No departments match your filters.'
                            : 'No departments found. Create one to get started.'}
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
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Department;
