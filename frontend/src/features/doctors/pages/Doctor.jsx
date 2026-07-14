import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { BRANCH_LOCATIONS, BRANCHES } from '../../../common/utils';
import { Plus, Trash2, Search, Image, Camera, X } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import Pagination from '../../../common/components/Pagination';
import Modal from '../../../common/components/Modal';
import { toast } from 'react-hot-toast';

const Doctor = () => {
  const { user, hasPermission } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Add Doctor Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    designation: '',
    department_id: '',
    branch: '',
    location: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Debounce timer ref
  const debounceRef = useRef(null);

  // Determine allowed branches & locations for normal admin form dropdown
  const allowedBranches = user.role === 'super_admin' 
    ? BRANCHES 
    : (user.permissions?.branches || []);

  const getFilteredFormLocations = () => {
    if (!formData.branch) return [];
    if (user.role === 'super_admin') return BRANCH_LOCATIONS[formData.branch] || [];
    
    // Normal admin: filter assigned locations by the selected branch
    return (user.permissions?.locations || [])
      .filter(l => l.branch === formData.branch)
      .map(l => l.location);
  };

  const getFilteredFilterLocations = () => {
    if (!filterBranch) return [];
    if (user.role === 'super_admin') return BRANCH_LOCATIONS[filterBranch] || [];
    return (user.permissions?.locations || [])
      .filter(l => l.branch === filterBranch)
      .map(l => l.location);
  };

  const fetchDoctors = useCallback(async (currentSearch) => {
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
      if (filterLocation) params.location = filterLocation;
      if (filterDept) params.department_id = filterDept;
      
      const res = await api.get('/doctors', { params });
      setDoctors(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation, filterDept]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch when page, limit, sort, or filters change
  useEffect(() => {
    fetchDoctors(search);
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation, filterDept]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchDoctors(value);
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

  const handleBranchChange = (e) => {
    const branch = e.target.value;
    setFormData({
      ...formData,
      branch,
      location: '', // Reset location when branch changes
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image/photo files are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB.');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      name: '',
      designation: '',
      department_id: '',
      branch: '',
      location: '',
    });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    const { employee_id, name, designation, department_id, branch, location } = formData;

    if (!employee_id || !name || !designation || !department_id || !branch || !location) {
      toast.error('All fields are required.');
      return;
    }
    if (!photoFile) {
      toast.error('Please upload a doctor photo.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading('Adding doctor...');

    const submissionData = new FormData();
    submissionData.append('employee_id', employee_id.trim());
    submissionData.append('name', name.trim());
    submissionData.append('designation', designation.trim());
    submissionData.append('department_id', department_id);
    submissionData.append('branch', branch);
    submissionData.append('location', location);
    submissionData.append('photo', photoFile);

    try {
      await api.post('/doctors', submissionData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Doctor added successfully!', { id: loadToast });
      setIsModalOpen(false);
      resetForm();
      fetchDoctors(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding doctor.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete doctor "${name}"?`)) return;

    const loadToast = toast.loading('Deleting doctor...');
    try {
      await api.delete(`/doctors/${id}`);
      toast.success('Doctor profile deleted successfully!', { id: loadToast });
      // If we deleted the last item on the current page, go back one page
      if (doctors.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchDoctors(search);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting doctor.', { id: loadToast });
    }
  };

  const getFullPhotoUrl = (url) => {
    if (!url) return '';
    return `http://localhost:5000${url}`;
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls & Search bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, ID, or title..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all bg-slate-900/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="relative">
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setFilterLocation('');
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

          {/* Location Filter */}
          <div className="relative">
            <select
              value={filterLocation}
              disabled={!filterBranch}
              onChange={(e) => {
                setFilterLocation(e.target.value);
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">All Locations</option>
              {getFilteredFilterLocations().map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Add Doctor Button */}
          {hasPermission('Doctor', 'create') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5 ml-auto xl:ml-0"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
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
                    Clinician{getSortIcon('name')}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('employee_id')}
                  >
                    Employee ID{getSortIcon('employee_id')}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('designation')}
                  >
                    Title / Designation{getSortIcon('designation')}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('department_name')}
                  >
                    Department{getSortIcon('department_name')}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => handleSort('branch')}
                  >
                    Area / Location{getSortIcon('branch')}
                  </th>
                  {hasPermission('Doctor', 'delete') && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/30 text-sm">
                {doctors.length > 0 ? (
                  doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/20 transition-colors">
                      {/* Photo & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-slate-800 overflow-hidden bg-slate-900/80 flex items-center justify-center">
                            {doc.photo_url ? (
                              <img 
                                src={getFullPhotoUrl(doc.photo_url)} 
                                alt={doc.name} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Image className="w-4.5 h-4.5 text-slate-650" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{doc.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{doc.employee_id}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{doc.designation}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400 text-xs font-semibold">
                          {doc.department_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-200 text-xs">{doc.branch}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{doc.location}</span>
                        </div>
                      </td>
                      {hasPermission('Doctor', 'delete') && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Delete Doctor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasPermission('Doctor', 'delete') ? 6 : 5} className="px-6 py-16 text-center text-slate-500 font-medium">
                      {search || filterBranch || filterDept
                        ? 'No doctors match your search criteria.'
                        : 'No doctors found. Add a doctor to get started.'}
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

      {/* Add Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Register New Doctor"
      >
        <form onSubmit={handleAddDoctor} className="space-y-5">
          {/* Photo Upload with Preview */}
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            {photoPreview ? (
              <div className="relative w-28 h-28 rounded-full border border-slate-700/60 overflow-hidden shadow-inner group">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer space-y-2 group">
                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-slate-850 transition-colors">
                  <Camera className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-300">Upload Photo</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG or WEBP (Max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">EMPLOYEE ID</label>
              <input
                type="text"
                placeholder="e.g. EMP1024"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>

            {/* Doctor Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DOCTOR NAME</label>
              <input
                type="text"
                placeholder="Dr. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DESIGNATION</label>
              <input
                type="text"
                placeholder="e.g. Consultant Cardiologist"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-650"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DEPARTMENT</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">BRANCH</label>
              <select
                value={formData.branch}
                onChange={handleBranchChange}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
              >
                <option value="">Select Branch</option>
                {allowedBranches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">LOCATION</label>
              <select
                value={formData.location}
                disabled={!formData.branch}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">Select Location</option>
                {getFilteredFormLocations().map((loc) => (
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
                setIsModalOpen(false);
                resetForm();
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
              Save Doctor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Doctor;
