import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Save, X, Calendar, AlertTriangle } from 'lucide-react';
import api from '../../../common/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../app/context/AuthContext';
import Pagination from '../../../common/components/Pagination';

const DoctorSettings = () => {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null);

  const debounceRef = useRef(null);
  const sseRef = useRef(null);

  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const parseDisplayDays = (value) => {
    if (!value) return [];
    try {
      const rawDays = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(rawDays)) {
        return rawDays;
      }
      if (rawDays && typeof rawDays === 'object') {
        const allDays = new Set();
        Object.values(rawDays).forEach((arr) => {
          if (Array.isArray(arr)) arr.forEach((day) => allDays.add(day));
        });
        return Array.from(allDays);
      }
    } catch (error) {
      return [];
    }
    return [];
  };

  const assignmentKey = (assignment) => `${assignment.branch_id}:${assignment.location_id}`;

  const getInitialAssignment = (doc) => {
    const assignments = doc.assignments || [];
    if (assignments.length === 0) return null;
    return assignments.find((assignment) => parseDisplayDays(assignment.display_days).length > 0) || assignments[0];
  };

  // ─── Fetch doctors from the dedicated shuffling endpoint ──────────────────
  // This endpoint:
  //   • Filters by the user's assigned locations (for normal_admin)
  //   • Includes ALL departments (active + inactive) with dept status flag
  const fetchDoctors = useCallback(async (currentSearch = searchQuery, currentPage = page, currentLimit = limit) => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: currentLimit,
        search: currentSearch,
      };

      const response = await api.get('/doctors/for-shuffling', { params });
      setDoctors(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error(error);
      // Only show error toast if it's not a 403 (handled by the API interceptor)
      if (error.response?.status !== 403) {
        toast.error('Failed to load doctors.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, limit]);

  // Initial fetch + re-fetch when page/limit change
  useEffect(() => {
    fetchDoctors(searchQuery, page, limit);
  }, [page, limit]);

  // ─── SSE: Real-time sync when super-admin changes dept status ─────────────
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;
    const token = localStorage.getItem('token');

    const connect = () => {
      // Close any existing connection
      if (sseRef.current) {
        sseRef.current.close();
      }

      const es = new EventSource(`${baseUrl}/display/stream`);
      sseRef.current = es;

      es.onmessage = (event) => {
        if (event.data === '"update"' || event.data === 'update') {
          // Re-fetch silently – no loading spinner, just update cards in background
          fetchDoctors(searchQuery, page, limit);
        }
      };

      es.onerror = () => {
        es.close();
        // Retry after 5 seconds
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Search with debounce ─────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchDoctors(value, 1, limit);
    }, 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  // ─── Department status check ───────────────────────────────────────────────
  /**
   * Returns true if ALL of the doctor's department assignments are active (status = 1).
   * Returns false (disabled) if ANY assignment has department_status = 0.
   * This is a GLOBAL check — not location-scoped.
   */
  const isDoctorDeptActive = (doc) => {
    const assignments = doc.assignments || [];
    if (assignments.length === 0) return true;
    // department_status comes from the backend as 0 or 1 (MySQL TINYINT)
    return assignments.every((a) => a.department_status === 1 || a.department_status === true);
  };

  /**
   * Returns the names of inactive departments for a doctor (for tooltip/badge).
   */
  const getInactiveDepts = (doc) => {
    const assignments = doc.assignments || [];
    return [...new Set(
      assignments
        .filter((a) => a.department_status === 0 || a.department_status === false)
        .map((a) => a.department_name)
        .filter(Boolean)
    )];
  };

  // ─── Modal open ───────────────────────────────────────────────────────────
  const handleSelectDoctor = (doc) => {
    // Block click if any department is inactive
    if (!isDoctorDeptActive(doc)) return;

    setSelectedDoctor(doc);

    const initialAssignment = getInitialAssignment(doc);
    setSelectedAssignmentKey(initialAssignment ? assignmentKey(initialAssignment) : '');
    const parsedDays = parseDisplayDays(initialAssignment?.display_days || doc.display_days);
    setSelectedDays(parsedDays);
  };

  const handleAssignmentChange = (e) => {
    const nextKey = e.target.value;
    setSelectedAssignmentKey(nextKey);
    const nextAssignment = (selectedDoctor?.assignments || []).find((assignment) => assignmentKey(assignment) === nextKey);
    setSelectedDays(parseDisplayDays(nextAssignment?.display_days));
  };

  const toggleDay = (day) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedDoctor) return;
    const selectedAssignment = (selectedDoctor.assignments || []).find((assignment) => assignmentKey(assignment) === selectedAssignmentKey)
      || getInitialAssignment(selectedDoctor);

    if (!selectedAssignment) {
      toast.error('Select a branch/location before saving availability.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/sittings', {
        employee_id: selectedDoctor.employee_id,
        branch_id: selectedAssignment.branch_id,
        location_id: selectedAssignment.location_id,
        display_days: selectedDays,
      });
      toast.success('Settings saved successfully!');
      setSelectedDoctor(null);
      fetchDoctors(searchQuery, page, limit);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Doctor Shuffling</h1>
          <p className="text-slate-400 mt-1 text-lg">
            Configure display days for doctors on the digital signage.
            {user?.role === 'normal_admin' && (
              <span className="ml-2 text-sm text-emerald-400">
                Showing doctors for your assigned locations only.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-800/40">
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search doctors by Name or Employee ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 text-slate-200 font-medium placeholder-slate-500 transition-all focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : doctors.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => {
                const isActive = isDoctorDeptActive(doc);
                const inactiveDepts = getInactiveDepts(doc);

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoctor(doc)}
                    title={
                      !isActive
                        ? `Department Inactive: ${inactiveDepts.join(', ')}`
                        : 'Click to configure display days'
                    }
                    className={`p-4 rounded-xl border transition-all flex items-start gap-4 relative
                      ${isActive
                        ? 'border-slate-800/60 bg-slate-900/20 cursor-pointer hover:border-emerald-500/60 hover:bg-slate-800/40'
                        : 'border-rose-900/40 bg-slate-900/10 cursor-not-allowed opacity-50 select-none'
                      }`}
                  >
                    {/* Inactive overlay badge */}
                    {!isActive && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wide">
                        <AlertTriangle className="w-3 h-3" />
                        Dept Inactive
                      </div>
                    )}

                    {/* Doctor avatar */}
                    <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border flex items-center justify-center
                      ${isActive ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700/50'}`}
                    >
                      {doc.photo_url ? (
                        <img
                          src={doc.photo_url.startsWith('http') ? doc.photo_url : `http://${window.location.hostname}:5000${doc.photo_url}`}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon name={doc.name} />
                      )}
                    </div>

                    {/* Doctor info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold truncate ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                        {doc.name}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">{doc.designation}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">ID: {doc.employee_id}</p>

                      {/* Location / department badges */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {[...new Set((doc.assignments || []).map((a) => a.location_name))].filter(Boolean).map((loc) => (
                          <span key={loc} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {loc}
                          </span>
                        ))}
                        {[...new Set((doc.assignments || []).map((a) => a.department_name))].filter(Boolean).map((dept) => {
                          // Find if this dept is inactive
                          const deptInactive = (doc.assignments || []).some(
                            (a) => a.department_name === dept && (a.department_status === 0 || a.department_status === false)
                          );
                          return (
                            <span
                              key={dept}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border
                                ${deptInactive
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                            >
                              {dept}
                              {deptInactive && ' (Inactive)'}
                            </span>
                          );
                        })}
                      </div>

                      {/* Display days by branch/location */}
                      {isActive && (
                        <div className="mt-2 space-y-2">
                          {(doc.assignments || []).map((assignment) => {
                            const days = parseDisplayDays(assignment.display_days);
                            return (
                              <div key={`${assignment.branch_id}-${assignment.location_id}`} className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                                    {assignment.branch_name} / {assignment.location_name}{assignment.shift_time ? ` • ${assignment.shift_time}` : ''}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {days.length > 0 ? days.map((day) => (
                                    <span key={`${assignment.branch_id}-${assignment.location_id}-${day}`} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">
                                      {day}
                                    </span>
                                  )) : (
                                    <span className="text-xs text-slate-500 italic">No days configured</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.totalRecords > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  loading={loading}
                />
              </div>
            )}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12 text-slate-500">
            No doctors found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            No doctors found.
          </div>
        )}
      </div>

      {/* ── Day-selection Modal ── */}
      <AnimatePresence>
        {selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedDoctor(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-200">Display Days</h2>
                    <p className="text-sm text-slate-400">{selectedDoctor.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-slate-300 mb-4">Select the days this doctor should be displayed:</p>

                {selectedDoctor?.assignments?.length > 0 && (
                  <div className="mb-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Branch / Location wise days</p>
                    <div className="space-y-2">
                      {selectedDoctor.assignments.map((assignment) => {
                        const days = parseDisplayDays(assignment.display_days);
                        const isSelected = assignmentKey(assignment) === selectedAssignmentKey;
                        return (
                          <div key={assignmentKey(assignment)} className={`rounded-lg border px-3 py-2 ${isSelected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800/80 bg-slate-900/30'}`}>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-slate-200">
                                {assignment.branch_name} / {assignment.location_name}
                              </span>
                              {assignment.shift_time && (
                                <span className="text-[11px] text-slate-400">{assignment.shift_time}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {days.length > 0 ? days.map((day) => (
                                <span key={`${assignmentKey(assignment)}-${day}`} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {day}
                                </span>
                              )) : <span className="text-xs text-slate-500 italic">No days configured</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDoctor?.assignments?.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Branch / Location
                    </label>
                    <select
                      value={selectedAssignmentKey}
                      onChange={handleAssignmentChange}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {selectedDoctor.assignments.map((assignment) => (
                        <option key={assignmentKey(assignment)} value={assignmentKey(assignment)}>
                          {assignment.branch_name} / {assignment.location_name}
                          {assignment.shift_time ? ` • ${assignment.shift_time}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2
                        ${selectedDays.includes(day)
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 border border-slate-700 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Configuration
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserIcon = ({ name }) => (
  <span className="text-slate-500 font-bold text-lg">
    {name?.charAt(0) || '?'}
  </span>
);

export default DoctorSettings;
