import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Image, Camera, X, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import Pagination from '../../../common/components/Pagination';
import Modal from '../../../common/components/Modal';
import { toast } from 'react-hot-toast';

const Doctor = () => {
  const { user, hasPermission } = useAuth();
  const [doctors, setDoctors] = useState([]);
  
  // Dynamic masters
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filter dropdown sources
  const [filterLocationsList, setFilterLocationsList] = useState([]);
  const [filterDepartmentsList, setFilterDepartmentsList] = useState([]);

  // Form dropdown sources
  const [formLocationsList, setFormLocationsList] = useState([]);
  const [formDepartmentsList, setFormDepartmentsList] = useState([]);

  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    designation: '',
    department_id: '',
    branch_id: '',
    location_id: '',
    status: true,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const debounceRef = useRef(null);

  // 1. Fetch dynamic masters for form & filtering dropdowns
  const fetchMasters = useCallback(async () => {
    try {
      const branchesRes = await api.get('/branches?status=1');
      setBranches(branchesRes.data);

      const locationsRes = await api.get('/locations?status=1');
      setLocations(locationsRes.data);

      const departmentsRes = await api.get('/departments?status=1');
      setDepartments(departmentsRes.data);
    } catch (err) {
      console.error('Error fetching masters:', err);
      toast.error('Failed to load doctor configuration masters.');
    }
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  // Determine allowed branches for Normal Admin
  const allowedBranches = user.role === 'super_admin'
    ? branches
    : branches.filter((b) => (user.permissions?.branches || []).includes(b.name));

  // Handle selected branch change in form: loads locations under selected branch
  useEffect(() => {
    if (formData.branch_id) {
      const bid = parseInt(formData.branch_id, 10);
      const filteredLocs = locations.filter((l) => l.branch_id === bid);
      setFormLocationsList(filteredLocs);
    } else {
      setFormLocationsList([]);
    }
  }, [formData.branch_id, locations]);

  // Handle selected location change in form: loads departments under selected location
  useEffect(() => {
    if (formData.location_id) {
      const lid = parseInt(formData.location_id, 10);
      const filteredDepts = departments.filter((d) => d.location_id === lid);
      setFormDepartmentsList(filteredDepts);
    } else {
      setFormDepartmentsList([]);
    }
  }, [formData.location_id, departments]);

  // Handle branch selection in list filtering: loads locations under branch, resets location selection
  useEffect(() => {
    if (filterBranch) {
      const bid = parseInt(filterBranch, 10);
      const filteredLocs = locations.filter((l) => l.branch_id === bid);
      setFilterLocationsList(filteredLocs);
    } else {
      setFilterLocationsList([]);
    }
    setFilterLocation('');
  }, [filterBranch, locations]);

  // Handle location selection in list filtering: loads departments under location, resets department selection
  useEffect(() => {
    if (filterLocation) {
      const lid = parseInt(filterLocation, 10);
      const filteredDepts = departments.filter((d) => d.location_id === lid);
      setFilterDepartmentsList(filteredDepts);
    } else {
      setFilterDepartmentsList([]);
    }
    setFilterDept('');
  }, [filterLocation, departments]);

  // Fetch doctors listing
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
      if (filterBranch) params.branch_id = filterBranch;
      if (filterLocation) params.location_id = filterLocation;
      if (filterDept) params.department_id = filterDept;
      
      const res = await api.get('/doctors', { params });
      setDoctors(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doctors list.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation, filterDept]);

  // Refetch on pagination/filter changes
  useEffect(() => {
    fetchDoctors(search);
  }, [page, limit, sortBy, sortOrder, filterBranch, filterLocation, filterDept]);

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
      branch_id: '',
      location_id: '',
      status: true,
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setEditingDoctor(null);
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    const { employee_id, name, designation, department_id, branch_id, location_id, status } = formData;

    if (!employee_id || !name || !designation || !department_id || !branch_id || !location_id) {
      toast.error('All form fields are required.');
      return;
    }
    if (!editingDoctor && !photoFile) {
      toast.error('Please upload a doctor photo.');
      return;
    }

    setSubmitting(true);
    const loadToast = toast.loading(editingDoctor ? 'Saving changes...' : 'Registering doctor...');

    const submissionData = new FormData();
    submissionData.append('employee_id', employee_id.trim());
    submissionData.append('name', name.trim());
    submissionData.append('designation', designation.trim());
    submissionData.append('department_id', department_id);
    submissionData.append('branch_id', branch_id);
    submissionData.append('location_id', location_id);
    submissionData.append('status', status ? '1' : '0');
    if (photoFile) {
      submissionData.append('photo', photoFile);
    }

    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, submissionData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Doctor details updated successfully!', { id: loadToast });
      } else {
        await api.post('/doctors', submissionData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Doctor registered successfully!', { id: loadToast });
      }
      setIsModalOpen(false);
      resetForm();
      fetchDoctors(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing request.', { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      employee_id: doc.employee_id,
      name: doc.name,
      designation: doc.designation,
      department_id: String(doc.department_id),
      branch_id: String(doc.branch_id),
      location_id: String(doc.location_id),
      status: doc.status,
    });
    setPhotoPreview(getFullPhotoUrl(doc.photo_url));
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (doc) => {
    const newStatus = !doc.status;
    const loadToast = toast.loading('Updating status...');
    try {
      const submissionData = new FormData();
      submissionData.append('employee_id', doc.employee_id);
      submissionData.append('name', doc.name);
      submissionData.append('designation', doc.designation);
      submissionData.append('department_id', String(doc.department_id));
      submissionData.append('branch_id', String(doc.branch_id));
      submissionData.append('location_id', String(doc.location_id));
      submissionData.append('status', newStatus ? '1' : '0');

      await api.put(`/doctors/${doc.id}`, submissionData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Doctor status set to ${newStatus ? 'Active' : 'Inactive'}!`, { id: loadToast });
      fetchDoctors(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.', { id: loadToast });
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete doctor "${name}"?`)) return;

    const loadToast = toast.loading('Deleting doctor...');
    try {
      await api.delete(`/doctors/${id}`);
      toast.success('Doctor profile deleted successfully!', { id: loadToast });
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

  const canCreate = hasPermission('Doctor', 'create');
  const canUpdate = hasPermission('Doctor', 'update');
  const canDelete = hasPermission('Doctor', 'delete');

  return (
    <div className="space-y-6">
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
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="">All Branches</option>
              {allowedBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
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
              {filterLocationsList.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={filterDept}
              disabled={!filterLocation}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-slate-900/40 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">All Departments</option>
              {filterDepartmentsList.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Add Doctor Button */}
          {canCreate && (
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
        <TableSkeleton rows={6} cols={7} />
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
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(doc)}
                          disabled={!canUpdate}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            doc.status
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                              : 'bg-rose-500/5 border-rose-500/10 text-rose-400 hover:bg-rose-500/15'
                          }`}
                        >
                          {doc.status ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(doc)}
                            className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                            title="Edit Doctor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Delete Doctor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500 font-medium">
                      {search || filterBranch || filterLocation || filterDept
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

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
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

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">BRANCH</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value, department_id: '', location_id: '' })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
              >
                <option value="">Select Branch</option>
                {allowedBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Location (dynamically loaded based on branch) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">LOCATION</label>
              <select
                value={formData.location_id}
                disabled={!formData.branch_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value, department_id: '' })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">
                  {!formData.branch_id ? 'Select Branch first...' : 'Select Location'}
                </option>
                {formLocationsList.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Department (dynamically loaded based on location) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">DEPARTMENT</label>
              <select
                value={formData.department_id}
                disabled={!formData.location_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">
                  {!formData.location_id ? 'Select Location first...' : 'Select Department'}
                </option>
                {formDepartmentsList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-350 uppercase tracking-wider mb-2">
              Active Status
            </label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: !formData.status })}
              className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {formData.status ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-500" />
              )}
              {formData.status ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors font-semibold text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5"
            >
              {editingDoctor ? 'Save Changes' : 'Register Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Doctor;
