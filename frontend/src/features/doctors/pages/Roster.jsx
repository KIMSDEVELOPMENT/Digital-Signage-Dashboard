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
  MapPin 
} from 'lucide-react';
import { TableSkeleton } from '../../../common/components/Skeleton';
import { toast } from 'react-hot-toast';

const Roster = () => {
  const { user, hasPermission, branches, branchLocations } = useAuth();
  
  // Determine allowed branches & locations for dropdown selection
  const allowedBranches = user.role === 'super_admin' 
    ? branches 
    : (user.permissions?.branches || []);

  // Selection state
  const [selectedBranch, setSelectedBranch] = useState('');
  
  // States
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [todayRoster, setTodayRoster] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [importing, setImporting] = useState(false);

  // Dynamic Validation / Duplicate confirmation states
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-select first branch & location on load
  useEffect(() => {
    if (allowedBranches.length > 0 && !selectedBranch) {
      const defaultBranch = allowedBranches[0];
      setSelectedBranch(defaultBranch);
    }
  }, [allowedBranches, user]);

  const fetchTodayRoster = async () => {
    if (!selectedBranch) return;
    
    try {
      setLoadingRoster(true);
      const res = await api.get(`/roster/today`, {
        params: { branch: selectedBranch }
      });
      setTodayRoster(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchTodayRoster();
  }, [selectedBranch]);

  const handleBranchChange = (e) => {
    const branch = e.target.value;
    setSelectedBranch(branch);
    setPreviewRows([]);
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
      setFile(selectedFile);
      handlePreview(selectedFile);
    }
  };

  const handlePreview = async (uploadFile) => {
    if (!selectedBranch) {
      toast.error('Please select a branch first.');
      setFile(null);
      return;
    }

    setLoadingPreview(true);
    const loadToast = toast.loading('Reading and matching Excel records...');
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await api.post(`/roster/preview?branch=${selectedBranch}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { duplicateExists, previewData } = res.data;
      setPreviewRows(previewData);
      setDuplicateExists(duplicateExists);
      toast.success('Excel records parsed successfully!', { id: loadToast });
    } catch (err) {
      console.error(err);
      const responseData = err.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        setValidationErrors(responseData.errors);
        setShowValidationModal(true);
        toast.error('Validation errors found in Excel file.', { id: loadToast });
      } else {
        const msg = responseData?.message || 'Error parsing Excel sheet.';
        toast.error(msg, { id: loadToast });
      }
      setFile(null);
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async (replace = false) => {
    if (previewRows.length === 0) return;

    setImporting(true);
    const loadToast = toast.loading("Saving today's roster...");

    const rosterData = previewRows.map(row => ({
      doctor_id: row.doctor_id,
      employee_id: row.employee_id,
      timing: row.timing
    }));

    try {
      await api.post('/roster/import', { roster: rosterData, replace });
      toast.success("Today's roster imported successfully!", { id: loadToast });
      setPreviewRows([]);
      setFile(null);
      setShowConfirmModal(false);
      fetchTodayRoster();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to import roster.', { id: loadToast });
    } finally {
      setImporting(false);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreviewRows([]);
  };

  const hasValidationErrors = previewRows.some(row => row.status === 'error');

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
          <div className="space-y-1.5 flex-1 w-full">
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

              {hasPermission('Duty Roster', 'create') ? (
                !file ? (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-950/40 cursor-pointer group transition-all duration-200">
                    <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors mb-3" />
                    <p className="text-sm font-semibold text-slate-300 text-center">Drag & drop excel sheet or browse</p>
                    <p className="text-[10px] text-slate-500 text-center mt-1">Accepts .xlsx and .xls formats</p>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col space-y-4">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={clearPreview}
                        className="flex-1 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors font-semibold text-xs cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => duplicateExists ? setShowConfirmModal(true) : handleImport(false)}
                        disabled={importing || hasValidationErrors || previewRows.length === 0}
                        className="flex-1 py-2 rounded-lg font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/20 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-400/5 cursor-pointer"
                      >
                        Import Today's Roster
                      </button>
                    </div>
                  </div>
                )
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
            
            {/* 1. Preview Table */}
            {previewRows.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/30 pb-3">
                  <h3 className="font-heading font-semibold text-white">Roster Excel Preview</h3>
                  {hasValidationErrors && (
                    <div className="flex items-center gap-1 text-rose-400 text-xs font-semibold">
                      <AlertTriangle className="w-4.5 h-4.5" />
                      Resolve matching errors
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/60 max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Site/Block</th>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Timing</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/30">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3 text-slate-300">
                            <div>
                              <span className="font-semibold block">{row.site_name || 'N/A'}</span>
                              <span className="text-[10px] text-slate-500">{row.block_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-semibold text-white block">{row.doctor_name || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-500">{row.department || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-400">{row.timing}</td>
                          <td className="px-4 py-3 text-right">
                            {row.employee_id ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Today's active roster list */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-850 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/30 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-heading font-semibold text-white">Today's Scheduled Clinicians</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Currently active schedule in this area</p>
                  </div>
                </div>
                <button
                  onClick={fetchTodayRoster}
                  disabled={loadingRoster}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRoster ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingRoster ? (
                <TableSkeleton rows={4} cols={4} />
              ) : todayRoster.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Shift Timing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/30">
                      {todayRoster.map((item) => (
                        <tr key={item.roster_id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{item.doctor_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{item.employee_id}</td>
                          <td className="px-4 py-3 text-slate-300">{item.department_name}</td>
                          <td className="px-4 py-3 font-medium text-emerald-400">{item.timing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center border border-slate-800/40 bg-slate-950/20 rounded-xl">
                  <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No duty roster uploaded for today yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Upload an Excel schedule sheet above to populate today's clinic board.</p>
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

      {/* Duplicate Roster Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-heading font-semibold text-white">Replace Existing Roster?</h3>
                <p className="text-xs text-emerald-400/80">Duplicate Roster Detected</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A duty roster already exists for this branch and date. Do you want to Replace the existing roster?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  clearPreview();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleImport(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roster;
