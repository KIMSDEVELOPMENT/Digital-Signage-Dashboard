import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { BRANCH_LOCATIONS, BRANCHES } from '../../../common/utils';
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
  const { user, hasPermission } = useAuth();
  
  // Determine allowed branches & locations for dropdown selection
  const allowedBranches = user.role === 'super_admin' 
    ? BRANCHES 
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

  // Auto-select first branch & location on load
  useEffect(() => {
    if (allowedBranches.length > 0) {
      const defaultBranch = allowedBranches[0];
      setSelectedBranch(defaultBranch);
    }
  }, [user]);

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
      const res = await api.post('/roster/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewRows(res.data);
      toast.success('Excel records parsed successfully!', { id: loadToast });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error parsing Excel sheet.', { id: loadToast });
      setFile(null);
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    
    const hasErrors = previewRows.some(row => row.status === 'error');
    if (hasErrors) {
      toast.error('Import blocked. Please resolve Excel file matching errors first.');
      return;
    }

    setImporting(true);
    const loadToast = toast.loading("Saving today's roster...");

    const rosterData = previewRows.map(row => ({
      employee_id: row.employee_id,
      timing: row.timing
    }));

    try {
      await api.post('/roster/import', { roster: rosterData });
      toast.success("Today's roster imported successfully!", { id: loadToast });
      setPreviewRows([]);
      setFile(null);
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

        <div className="grid grid-cols-1 max-w-md">
          {/* Branch select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">BRANCH</label>
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
                        className="flex-1 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors font-semibold text-xs"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleImport}
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
                  <li>Must contain column: <code className="text-[10px] text-emerald-400 px-1 bg-emerald-400/5 border border-emerald-500/10 rounded">Employee ID</code></li>
                  <li>Must contain column: <code className="text-[10px] text-emerald-400 px-1 bg-emerald-400/5 border border-emerald-500/10 rounded">Timing</code></li>
                  <li>All doctors scheduled must already be registered in the directory.</li>
                  <li>Importing will replace any existing roster for this screen for today.</li>
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
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Timing</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/30">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-300">{row.employee_id || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-semibold text-white block">{row.doctor_name}</span>
                              <span className="text-[10px] text-slate-500">{row.department_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-400">{row.timing}</td>
                          <td className="px-4 py-3 text-right">
                            {row.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Match
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold cursor-help"
                                title={row.error_message}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Mismatch
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
                  className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
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
    </div>
  );
};

export default Roster;
