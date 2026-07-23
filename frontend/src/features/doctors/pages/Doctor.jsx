import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Plus, Trash2, Search, Image, Camera, X, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { TableRowSkeleton } from '../../../common/components/Skeleton';
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
    status: true,
    assignments: []
  });

  // Temp assignment selector state
  const [tempBranch, setTempBranch] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempDept, setTempDept] = useState('');

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const debounceRef = useRef(null);

  const fetchMasters = useCallback(async () => {
    try {
      const branchesRes = await api.get('/branches?status=1', { params: { limit: 1000 } });
      setBranches(branchesRes.data.data || branchesRes.data);

      const locationsRes = await api.get('/locations?status=1', { params: { limit: 1000 } });
      setLocations(locationsRes.data.data || locationsRes.data);

      const departmentsRes = await api.get('/departments?status=1', { params: { limit: 1000 } });
      setDepartments(departmentsRes.data.data || departmentsRes.data);
    } catch (err) {
      console.error('Error fetching masters:', err);
      toast.error('Failed to load doctor configuration masters.');
    }
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  const allowedBranches = user.role === 'super_admin'
    ? branches
    : branches.filter((b) => (user.permissions?.branches || []).includes(b.name));

  // Form Temp Location Dropdown
  const tempLocationsList = tempBranch 
    ? locations.filter((l) => l.branch_id === parseInt(tempBranch, 10)) 
    : [];

  const tempDepartmentsList = tempLocation 
    ? departments.filter((d) => d.location_id === parseInt(tempLocation, 10))
    : [];

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

  const fetchDoctors = useCallback(async (currentSearch) => {
    try {
      setLoading(true);
      const params = { page, limit, sortBy, sortOrder };
      
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

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLimitChange = (newLimit) => { setLimit(newLimit); setPage(1); };

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
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadToast = toast.loading('Uploading bulk doctors...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post('/doctors/upload-bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success(res.data.message || 'Bulk upload successful!', { id: loadToast });
      fetchDoctors(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error during bulk upload.', { id: loadToast });
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const resetForm = () => {
    setFormData({ employee_id: '', name: '', designation: '', status: true, assignments: [] });
    setPhotoFile(null);
    setPhotoPreview('');
    setEditingDoctor(null);
    setTempBranch('');
    setTempLocation('');
    setTempDept('');
  };

  const handleRemoveAssignment = (index) => {
    const newAssignments = [...formData.assignments];
    newAssignments.splice(index, 1);
    setFormData({ ...formData, assignments: newAssignments });
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    let { employee_id, name, designation, status, assignments } = formData;

    if (!employee_id || !name || !designation) {
      toast.error('Employee ID, Name, and Designation are required.');
      return;
    }
    if (assignments.length === 0) {
      toast.error('At least one assignment is required.');
      return;
    }

    name = name.trim();
    if (!name) {
      toast.error('Doctor name is required.');
      return;
    }
    
    name = 'Dr. ' + name.replace(/^Dr\.?\s*/i, '').trim().toUpperCase();

    setSubmitting(true);
    const loadToast = toast.loading(editingDoctor ? 'Saving changes...' : 'Registering doctor...');

    const submissionData = new FormData();
    submissionData.append('employee_id', employee_id.trim());
    submissionData.append('name', name);
    submissionData.append('designation', designation.trim());
    submissionData.append('status', status ? '1' : '0');
    submissionData.append('assignments', JSON.stringify(assignments));

    if (photoFile) {
      submissionData.append('photo', photoFile);
    } else if (editingDoctor && editingDoctor.photo_url && !photoPreview) {
      submissionData.append('remove_photo', 'true');
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
      if (editingDoctor) {
        setIsModalOpen(false);
      }
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
      name: doc.name ? doc.name.replace(/^Dr\.?\s*/i, '').trim() : '',
      designation: doc.designation,
      status: !!doc.status,
      assignments: doc.assignments || [],
    });
    setPhotoPreview(doc.photo_url ? getFullPhotoUrl(doc.photo_url) : '');
    setPhotoFile(null);
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
      submissionData.append('status', newStatus ? '1' : '0');
      submissionData.append('assignments', JSON.stringify(doc.assignments || []));

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
      <div className="mb-6 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="relative w-full xl:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, ID, or title..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm transition-all bg-[#0f172a]/40 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-white placeholder-slate-500 shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          {user?.role === 'super_admin' && (
            <div className="flex items-center gap-2 mr-2">
              <a
                href="http://localhost:5000/api/doctors/template"
                download
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all border border-slate-700 cursor-pointer text-center"
              >
                Download Template
              </a>
              <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-blue-500/20 shadow-lg cursor-pointer flex items-center justify-center">
                Bulk Upload
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} />
              </label>
            </div>
          )}

          {canCreate && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-emerald-500/20 shadow-lg cursor-pointer ml-auto xl:ml-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel border border-slate-800/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none text-xs font-semibold text-slate-400 uppercase tracking-wider" onClick={() => handleSort('name')}>
                  Clinician{getSortIcon('name')}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none text-xs font-semibold text-slate-400 uppercase tracking-wider" onClick={() => handleSort('employee_id')}>
                  Employee ID{getSortIcon('employee_id')}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none text-xs font-semibold text-slate-400 uppercase tracking-wider" onClick={() => handleSort('designation')}>
                  Title / Designation{getSortIcon('designation')}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Departments
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Branches
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Locations
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors select-none text-xs font-semibold text-slate-400 uppercase tracking-wider" onClick={() => handleSort('status')}>
                  Status{getSortIcon('status')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {loading ? (
                <TableRowSkeleton rows={5} cols={8} />
              ) : doctors.length > 0 ? (
                doctors.map((doc) => {
                  const depts = [...new Set((doc.assignments || []).map(a => a.department_name))].filter(Boolean);
                  const branches = [...new Set((doc.assignments || []).map(a => a.branch_name))].filter(Boolean);
                  const locs = [...new Set((doc.assignments || []).map(a => a.location_name))].filter(Boolean);

                  return (
                  <tr key={doc.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-800 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                          {doc.photo_url ? (
                            <img src={getFullPhotoUrl(doc.photo_url)} alt={doc.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <Image className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{doc.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">{doc.employee_id}</td>
                    <td className="px-6 py-4 text-slate-300">{doc.designation}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {depts.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {branches.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {locs.map((l, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(doc)}
                        disabled={!canUpdate}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          doc.status
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {doc.status ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {canUpdate && (
                          <button onClick={() => handleEdit(doc)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors cursor-pointer" title="Edit Doctor">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">
                    {search || filterBranch || filterLocation || filterDept
                      ? 'No doctors match your search criteria.'
                      : 'No doctors found. Add a doctor to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalRecords > 0 && (
          <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              loading={loading}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <form onSubmit={handleAddDoctor} className="space-y-5">
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-700/60 rounded-2xl bg-slate-900/30 group transition-all hover:bg-slate-900/50 hover:border-emerald-500/50">
            {photoPreview ? (
              <div className="relative w-24 h-24 rounded-full border border-slate-700/60 overflow-hidden shadow-inner group-hover:border-emerald-500/50 transition-colors">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(''); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer space-y-2">
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">Upload Photo</p>
                  <p className="text-[11px] text-slate-500 mt-1">JPG, PNG or WEBP (Max 5MB)</p>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</label>
              <input type="text" placeholder="e.g. EMP1024" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white placeholder-slate-600 transition-colors shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doctor Name</label>
              <div className="flex bg-[#070b14] border border-slate-800/80 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-inner overflow-hidden transition-colors">
                <span className="flex items-center justify-center px-4 bg-slate-800/50 border-r border-slate-800/80 text-slate-400 font-semibold text-sm select-none">
                  Dr.
                </span>
                <input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="flex-1 px-3 py-3 text-sm bg-transparent border-none focus:outline-none text-white placeholder-slate-600" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
            <input type="text" placeholder="e.g. Consultant Cardiologist" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-white placeholder-slate-600 transition-colors shadow-inner" />
          </div>

          <div className="space-y-3 p-4 border border-slate-800/60 rounded-2xl bg-slate-900/10">
            <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
              Configuration
            </label>
            
            <div className="flex flex-col gap-3">
              <select value={tempBranch} onChange={(e) => { setTempBranch(e.target.value); setTempLocation(''); setTempDept(''); }} className="w-full px-4 py-2.5 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:outline-none text-slate-300 shadow-inner">
                <option value="">Select Branch</option>
                {allowedBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select disabled={!tempBranch} value={tempLocation} onChange={(e) => { setTempLocation(e.target.value); setTempDept(''); }} className="w-full px-4 py-2.5 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:outline-none text-slate-300 disabled:opacity-50 shadow-inner cursor-pointer">
                <option value="">Select Location</option>
                {tempLocationsList.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select disabled={!tempLocation} value={tempDept} onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const did = parseInt(val, 10);
                const lid = parseInt(tempLocation, 10);
                const bid = parseInt(tempBranch, 10);
                
                const isDuplicate = formData.assignments.some(a => a.branch_id === bid && a.location_id === lid && a.department_id === did);
                if (isDuplicate) {
                  toast.error('This assignment is already added.');
                  return;
                }

                const existingBlockInBranch = formData.assignments.find(a => a.branch_id === bid && a.location_id !== lid);
                if (existingBlockInBranch) {
                  toast.error(`Doctor is already assigned to block ${existingBlockInBranch.location_name} in this branch. Cannot assign to multiple blocks in the same branch.`);
                  return;
                }

                const branchName = branches.find(b => b.id === bid)?.name;
                const locName = locations.find(l => l.id === lid)?.name;
                const deptName = departments.find(d => d.id === did)?.name;
                
                setFormData({
                  ...formData,
                  assignments: [...formData.assignments, { branch_id: bid, location_id: lid, department_id: did, branch_name: branchName, location_name: locName, department_name: deptName }]
                });
                setTempBranch('');
                setTempLocation('');
                setTempDept('');
              }} className="w-full px-4 py-2.5 rounded-xl text-sm bg-[#070b14] border border-slate-800/80 focus:border-emerald-500 focus:outline-none text-slate-300 disabled:opacity-50 cursor-pointer shadow-inner">
                <option value="">Select Department</option>
                {tempDepartmentsList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {formData.assignments.length > 0 ? (
              <div className="flex flex-col gap-2 mt-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {formData.assignments.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-800/40 rounded-lg text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-medium text-emerald-400">{a.branch_name}</span>
                      <span className="text-slate-500">/</span>
                      <span className="truncate">{a.location_name}</span>
                      <span className="text-slate-500 px-1">&bull;</span>
                      <span className="truncate text-slate-200">{a.department_name}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveAssignment(idx)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors" title="Remove Assignment">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mt-2">No configuration added yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
              Active Status
            </label>
            <button type="button" onClick={() => setFormData({ ...formData, status: !formData.status })} className="flex items-center gap-3 font-semibold text-slate-200 cursor-pointer text-sm w-fit transition-opacity hover:opacity-80">
              {formData.status ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
              {formData.status ? 'Active' : 'Inactive'}
            </button>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/60 mt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-6 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
              {submitting ? 'Processing...' : (editingDoctor ? 'Save Changes' : 'Register Doctor')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Doctor;
