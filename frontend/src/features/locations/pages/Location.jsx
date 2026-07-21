import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Search, MapPin, Edit2, X, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../../common/components/Pagination';
import { TableRowSkeleton } from '../../../common/components/Skeleton';

const Location = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [locationStatus, setLocationStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef(null);

  const fetchBranches = async () => {
    try {
      // Fetch all active branches for the dropdown
      const res = await api.get('/branches?status=1');
      const branchData = res.data.data || res.data;
      setBranches(branchData.filter(b => b.status));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load branches.');
    }
  };

  const fetchLocations = useCallback(async (currentSearch) => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (currentSearch) params.search = currentSearch;

      const res = await api.get('/locations', { params });
      setLocations(res.data.data);
      setPagination({
         totalRecords: res.data.total,
         totalPages: res.data.totalPages,
         page: res.data.page,
         limit
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchLocations(search);
  }, [page, limit, fetchLocations]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLocations(value);
    }, 400);
  };

  const resetForm = () => {
    setLocationName('');
    setBranchId('');
    setLocationStatus(true);
    setEditingLocation(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationName.trim() || !branchId) {
      toast.error('Location name and Branch are required.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading(editingLocation ? 'Updating location...' : 'Creating location...');
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, {
          branch_id: branchId,
          name: locationName.trim(),
          status: locationStatus ? 1 : 0,
        });
        toast.success('Location updated successfully!', { id: loadToast });
      } else {
        await api.post('/locations', {
          branch_id: branchId,
          name: locationName.trim(),
          status: locationStatus ? 1 : 0,
        });
        toast.success('Location created successfully!', { id: loadToast });
      }
      resetForm();
      fetchLocations(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing request.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (loc) => {
    setEditingLocation(loc);
    setLocationName(loc.name);
    setBranchId(loc.branch_id);
    setLocationStatus(loc.status === 1);
    setShowAddForm(true);
  };

  const handleDelete = async (loc) => {
    if (!window.confirm(`Are you sure you want to deactivate "${loc.name}"?`)) return;

    const loadToast = toast.loading('Deactivating location...');
    try {
      await api.delete(`/locations/${loc.id}`);
      toast.success('Location deactivated successfully!', { id: loadToast });
      fetchLocations(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate location.', { id: loadToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-2xl text-white tracking-tight">Location Master</h2>
          <p className="text-sm text-slate-400">Manage location configurations for digital displays and rosters.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create Location
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {showAddForm && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-white">
                {editingLocation ? 'Edit Location' : 'Create Location'}
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
                  Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="">Select a branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. KSS, A Block"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-grow cursor-pointer" htmlFor="status-toggle">
                  Active Status
                </label>
                <button
                  type="button"
                  id="status-toggle"
                  onClick={() => setLocationStatus(!locationStatus)}
                  className={`relative inline-flex items-center p-1 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${locationStatus ? 'bg-emerald-500/20' : 'bg-slate-800'}`}
                >
                  <span className={`inline-block w-4 h-4 bg-white rounded-full transition-transform duration-300 ${locationStatus ? 'translate-x-6 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'translate-x-0 bg-slate-400'}`} />
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl text-sm transition-all duration-200"
              >
                {submitting ? 'Saving...' : (editingLocation ? 'Save Changes' : 'Create Location')}
              </button>
            </form>
          </div>
        )}

        <div className={`glass-panel border border-slate-800/40 rounded-2xl overflow-hidden flex flex-col ${showAddForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-5 border-b border-slate-800/60 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/20">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={search}
                onChange={handleSearchChange}
                className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Location Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <TableRowSkeleton rows={5} cols={4} />
                ) : locations.length > 0 ? (
                  locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="py-4 px-6">
                        <span className="text-white font-medium">{loc.branch_name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-300">{loc.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        {loc.status === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => handleEdit(loc)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <MapPin className="w-8 h-8 text-slate-600" />
                        <p>No locations found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && pagination && pagination.totalRecords > 0 && (
            <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                totalRecords={pagination.totalRecords}
                limit={limit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Location;
