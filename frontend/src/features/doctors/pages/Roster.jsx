import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { 
  UploadCloud, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  CalendarDays, 
  RefreshCw, 
  MapPin,
  Trash2,
  Edit2,
  Save,
  Plus,
  Search
} from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import { toast } from 'react-hot-toast';

const Roster = () => {
  const { user, hasPermission, branches, branchLocations, getAssignedLocations } = useAuth();
  const assignedLocs = getAssignedLocations();
  
  // Determine allowed branches & locations for dropdown selection
  const allowedBranches = user.role === 'super_admin' 
    ? branches 
    : (user.permissions?.branches || []);

  // Selection state
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Edit State
  const [editingRosterId, setEditingRosterId] = useState(null);
  const [editTiming, setEditTiming] = useState('');
  
  // States
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [todayRoster, setTodayRoster] = useState([]);
  const [searchBranch, setSearchBranch] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [manualTiming, setManualTiming] = useState('09:00 AM - 05:00 PM');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [importing, setImporting] = useState(false);

  // Dynamic Validation / Duplicate confirmation states
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-assign branch and location for normal admins
  useEffect(() => {
    if (user && user.role !== 'super_admin' && assignedLocs && assignedLocs.length > 0) {
      setSelectedBranch(assignedLocs[0].branch);
      setSelectedLocation(assignedLocs[0].location);
    } else if (allowedBranches.length > 0 && !selectedBranch) {
      setSelectedBranch(allowedBranches[0]);
    }
  }, [allowedBranches, user, assignedLocs, selectedBranch]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      if (selectedBranch) {
        setAvailableLocations(branchLocations[selectedBranch] || []);
        setSelectedLocation('');
      } else {
        setAvailableLocations([]);
        setSelectedLocation('');
      }
    }
  }, [selectedBranch, branchLocations, user]);

  const fetchRoster = async () => {
    if (!selectedBranch || !selectedDate) return;
    
    try {
      setLoadingRoster(true);
      const res = await api.get(`/roster/date`, {
        params: { branch: selectedBranch, location: selectedLocation, date: selectedDate }
      });
      setTodayRoster(res.data);
    } catch (err) {
      console.error(err);
      setTodayRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [selectedBranch, selectedLocation, selectedDate]);

  useEffect(() => {
    // If selectedBranch changes and searchBranch is empty, sync it
    if (selectedBranch && !searchBranch) setSearchBranch(selectedBranch);
  }, [selectedBranch, searchBranch]);

  useEffect(() => {
    const branchToSearch = searchBranch || selectedBranch;
    if (!manualSearch || !branchToSearch) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/doctors', { params: { search: manualSearch, branch: branchToSearch, status: 1, location: selectedLocation } });
        const results = res.data.data || res.data;
        // Filter out doctors already in todayRoster
        const filtered = results.filter(doc => !todayRoster.some(r => r.doctor_id === doc.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [manualSearch, searchBranch, selectedBranch, selectedLocation, todayRoster]);

  const handleAddManualEntry = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !manualTiming) return;
    
    const loadToast = toast.loading('Adding manual entry...');
    try {
      await api.post('/roster/manual', {
        date: selectedDate,
        doctor_id: selectedDoctor.id,
        timing: manualTiming,
        branch: selectedBranch,
        location: selectedLocation
      });
      toast.success('Manual entry added successfully!', { id: loadToast });
      setManualSearch('');
      setSelectedDoctor(null);
      setManualTiming('09:00 AM - 05:00 PM');
      setSearchResults([]);
      fetchRoster();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add manual entry.', { id: loadToast });
    }
  };


  const handleUpdateTiming = async (id) => {
    if (!editTiming) return;
    const loadToast = toast.loading('Updating entry...');
    try {
      await api.put(`/roster/manual/${id}`, { timing: editTiming });
      toast.success('Entry updated successfully.', { id: loadToast });
      setEditingRosterId(null);
      setEditTiming('');
      fetchRoster();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update entry.', { id: loadToast });
    }
  };

  const handleDeleteManualEntry = async (id) => {
    if (!window.confirm('Are you sure you want to remove this doctor from the roster?')) return;
    
    const loadToast = toast.loading('Removing entry...');
    try {
      await api.delete(`/roster/manual/${id}`);
      toast.success('Entry removed successfully.', { id: loadToast });
      fetchRoster();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove entry.', { id: loadToast });
    }
  };

  const handleBranchChange = (e) => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    setPreviewRows([]);
    setManualSearch('');
    setSelectedDoctor(null);
  };

  const downloadRosterTemplate = async () => {
    if (!selectedBranch) return;
    const loadToast = toast.loading('Downloading template...');
    try {
      const response = await api.get(`/roster/template`, {
        params: { branch: selectedBranch },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Roster_Template_${selectedBranch}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully!', { id: loadToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download roster template.', { id: loadToast });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Only Excel files (.xlsx, .xls) are allowed.');
        return;
      }
      handleAutoImport(selectedFile);
    }
  };

  const handleAutoImport = async (uploadFile) => {
    if (!selectedBranch) {
      toast.error('Please select a branch first.');
      return;
    }

    setLoadingPreview(true);
    const loadToast = toast.loading('Uploading and importing roster...');
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      // 1. Preview/Validate
      const res = await api.post(`/roster/preview?branch=${selectedBranch}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { previewData } = res.data;
      
      // 2. Map payload
      const rosterData = previewData.map(row => ({
        date: row.date,
        doctor_id: row.doctor_id,
        employee_id: row.employee_id,
        timing: row.timing
      }));

      // 3. Import (auto replace)
      await api.post('/roster/import', { roster: rosterData, replace: true });
      
      toast.success("Roster imported successfully!", { id: loadToast });
      fetchRoster();
    } catch (err) {
      console.error(err);
      const responseData = err.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        setValidationErrors(responseData.errors);
        setShowValidationModal(true);
        toast.error('Validation errors found in Excel file.', { id: loadToast });
      } else {
        const msg = responseData?.message || 'Error processing Excel sheet.';
        toast.error(msg, { id: loadToast });
      }
    } finally {
      setLoadingPreview(false);
      // Reset input value so same file can be uploaded again if needed
      const fileInput = document.getElementById('roster-upload-input');
      if (fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Configuration Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/30 pb-3">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <h3 className="font-heading font-semibold text-white">Target Display Area</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 max-w-xl">
          {/* Branch select */}
          <div className="space-y-1.5 flex-1 w-full max-w-[200px]">
            <label className="text-xs font-semibold text-slate-300 block">BRANCH</label>
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer animate-none"
            >
              <option value="">Select Branch</option>
              {allowedBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 flex-1 w-full max-w-[200px]">
            <label className="text-xs font-semibold text-slate-300 block">DATE</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
            />
          </div>
          {selectedBranch && (
            <button
              onClick={downloadRosterTemplate}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 cursor-pointer h-[42px] transition-colors w-full sm:w-auto justify-center flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Template
            </button>
          )}
        </div>
      </div>

      {selectedBranch && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left panel: Excel Uploader */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800/30 pb-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-semibold text-white">Upload Spreadsheet</h3>
              </div>

              {hasPermission('Duty Roster', 'read') ? (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-950/40 cursor-pointer group transition-all duration-200">
                    <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors mb-3" />
                    <p className="text-sm font-semibold text-slate-300 text-center">
                      {loadingPreview ? 'Uploading & Processing...' : 'Drag & drop excel sheet or browse'}
                    </p>
                    <p className="text-[10px] text-slate-500 text-center mt-1">Accepts .xlsx and .xls formats</p>
                    <input
                      id="roster-upload-input"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      disabled={loadingPreview}
                      className="hidden"
                    />
                  </label>
              ) : (
                <div className="p-4 text-center border border-slate-800/40 bg-slate-950/20 rounded-xl text-slate-500 text-xs">
                  You do not have permissions to import roster schedules.
                </div>
              )}

              {/* Sample Instructions */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40 text-xs text-slate-400 space-y-2 leading-relaxed">
                <p className="font-semibold text-slate-300">Spreadsheet Template Rules:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Must contain exact columns in order: <code className="text-[10px] text-emerald-400 px-1 bg-emerald-400/5 border border-emerald-500/10 rounded">Date, Site Name, Block Name, Department Name, Doctor Name, Timing</code></li>
                  <li>Site Name must match the selected branch.</li>
                  <li>All doctors scheduled must already be registered in the directory for the branch.</li>
                  <li>Importing will replace any existing roster for this branch for today.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right panel: Preview or Today's Roster */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* 1. Today's Roster Header */}

            <div className="glass-panel p-6 rounded-2xl border border-slate-850 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/30 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-heading font-semibold text-white">Scheduled Clinicians</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Currently active schedule for {selectedDate}</p>
                  </div>
                </div>
                <button
                  onClick={fetchRoster}
                  disabled={loadingRoster}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRoster ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Manual Entry Form */}
              {hasPermission('Duty Roster', 'read') && (
                <form onSubmit={handleAddManualEntry} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  {user?.role === 'super_admin' && (
                    <div className="w-full sm:w-32 md:w-40 space-y-1.5 shrink-0">
                      <label className="text-xs font-semibold text-slate-300">Doctor Branch</label>
                      <select
                        value={searchBranch || selectedBranch}
                        onChange={(e) => {
                          setSearchBranch(e.target.value);
                          setSearchResults([]);
                          setManualSearch('');
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
                      >
                        {allowedBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-1.5 relative">
                    <label className="text-xs font-semibold text-slate-300">Doctor Search</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={selectedDoctor ? selectedDoctor.name : manualSearch}
                        onChange={(e) => {
                          setSelectedDoctor(null);
                          setManualSearch(e.target.value);
                        }}
                        placeholder="Search doctor name..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300"
                      />
                    </div>
                    {/* Search Dropdown */}
                    {!selectedDoctor && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-xl">
                        {searchResults.map(doc => (
                          <div 
                            key={doc.id}
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setManualSearch('');
                              setSearchResults([]);
                            }}
                            className="px-4 py-2 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 last:border-0"
                          >
                            <p className="text-sm font-semibold text-white">{doc.name}</p>
                            {(() => {
                                const assignment = doc.assignments?.find(a => 
                                  a.branch_name === (searchBranch || selectedBranch) && 
                                  (!selectedLocation || a.location_name === selectedLocation)
                                );
                                const deptName = assignment?.department_name || doc.assignments?.[0]?.department_name || 'No Dept';
                                return <p className="text-[10px] text-slate-400">{deptName} | {doc.employee_id}</p>;
                              })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-48 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Shift Timing</label>
                    <input
                      type="text"
                      value={manualTiming}
                      onChange={(e) => setManualTiming(e.target.value)}
                      placeholder="e.g. 09:00 AM - 05:00 PM"
                      className="w-full px-4 py-2 rounded-lg text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedDoctor || !manualTiming}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:bg-emerald-500/20 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Entry
                  </button>
                </form>
              )}

              {loadingRoster ? (
                <TableSkeleton rows={4} cols={5} />
              ) : todayRoster.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Shift Timing</th>
                        {hasPermission('Duty Roster', 'read') && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/30">
                      {todayRoster.map((item) => (
                        <tr key={item.roster_id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{item.doctor_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{item.employee_id}</td>
                          <td className="px-4 py-3 text-slate-300">{item.department_name}</td>
                          <td className="px-4 py-3 font-medium text-emerald-400">{item.timing}</td>
                          {hasPermission('Duty Roster', 'read') && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteManualEntry(item.roster_id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="Remove Entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center border border-slate-800/40 bg-slate-950/20 rounded-xl">
                  <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No duty roster active for {selectedDate}.</p>
                  <p className="text-xs text-slate-500 mt-1">Upload an Excel schedule sheet above or manually add entries to populate the clinic board.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Validation Errors Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-heading font-semibold text-white">Roster Validation Errors</h3>
                <p className="text-xs text-rose-400/80">Please resolve these errors in your spreadsheet and upload again.</p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs text-rose-300 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
              {validationErrors.map((err, idx) => (
                <div key={idx} className="flex gap-2 items-start py-1 border-b border-slate-900 last:border-0">
                  <span className="text-rose-500 flex-shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Roster Confirmation Dialog (Removed) */}
    </div>
  );
};

export default Roster;
