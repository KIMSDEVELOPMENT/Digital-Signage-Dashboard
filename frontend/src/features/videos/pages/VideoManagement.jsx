import React, { useState, useEffect } from 'react';
import { Video, UploadCloud, Trash2, AlertCircle, X, Plus } from 'lucide-react';
import api from '../../../common/services/api';
import { useAuth } from '../../../app/context/AuthContext';

const VideoManagement = () => {
  const { user, branches, branchLocations, getAssignedLocations } = useAuth();
  const assignedLocs = getAssignedLocations();
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);

  // Auto-assign branch and location for normal admins
  useEffect(() => {
    if (user && user.role !== 'super_admin' && assignedLocs && assignedLocs.length > 0) {
      setSelectedBranch(assignedLocs[0].branch);
      setSelectedLocation(assignedLocs[0].location);
    }
  }, [user, assignedLocs]);

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

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/videos');
      setVideos(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    if (user?.role === 'super_admin') {
      setSelectedBranch('');
      setSelectedLocation('');
    }
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedBranch || !selectedLocation || !title) {
      setError('Please fill all required fields and select a video file.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const branchRes = await api.get('/branches?limit=1000');
      const branchesArray = branchRes.data.data || branchRes.data;
      const branchObj = branchesArray.find(b => b.name === selectedBranch);

      const locRes = await api.get('/locations?limit=1000');
      const locsArray = locRes.data.data || locRes.data;
      const locObj = locsArray.find(l => l.branch_id === branchObj?.id && l.name === selectedLocation);

      if (!branchObj || !locObj) {
        throw new Error('Invalid branch or location.');
      }

      const formData = new FormData();
      formData.append('video', file);
      formData.append('branch_id', branchObj.id);
      formData.append('location_id', locObj.id);
      formData.append('title', title);

      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Video uploaded successfully.');
      setIsModalOpen(false);
      resetForm();
      fetchVideos();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      await api.delete(`/videos/${id}`);
      setSuccess('Video deleted successfully.');
      fetchVideos();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete video.');
    }
  };

  const getFullVideoUrl = (url) => {
    if (!url) return '';
    return `http://localhost:5000${url}`;
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Signage Video Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload promotional or announcement videos to play sequentially after the main display banner.
          </p>
        </div>
        
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Video
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="bg-[#0b1120]/80 border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Title</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">File Size</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Created Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Loading videos...
                  </td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No uploaded signage videos found.
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="hover:bg-slate-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{video.title || video.original_name}</span>
                        {isSuperAdmin && (
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                            {video.branch_name} • {video.location_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-300">
                      {Math.floor(video.duration / 60)}:{(Math.floor(video.duration % 60)).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-300">
                      {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f1524] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-800/80 bg-[#0f1524]">
              <h2 className="text-xl font-bold text-white tracking-wide">Upload Signage Video</h2>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-[#090d16] space-y-5">
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Video Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hospital Overview"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0b1120] border border-slate-800 focus:border-emerald-500 focus:outline-none text-slate-200 placeholder-slate-600 shadow-inner transition-colors"
                />
              </div>

              {isSuperAdmin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Branch *</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-[#0b1120] border border-slate-800 focus:border-emerald-500 focus:outline-none text-slate-200 shadow-inner"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Block / Location *</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      disabled={!selectedBranch}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-[#0b1120] border border-slate-800 focus:border-emerald-500 focus:outline-none text-slate-200 disabled:opacity-50 shadow-inner"
                    >
                      <option value="">Select Block</option>
                      {availableLocations.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Select Video File *
                </label>
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 rounded-2xl bg-[#0b1120] cursor-pointer group transition-all duration-200">
                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors mb-3" />
                  <p className="text-sm font-semibold text-slate-200 text-center">
                    {file ? file.name : 'Select video file...'}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center mt-2 font-medium tracking-wide">
                    Max 500 MB & 5 minutes (mp4, webm, mov, mkv)
                  </p>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/x-matroska,video/quicktime"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            <div className="p-5 bg-[#0f1524] border-t border-slate-800 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="px-8 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-colors w-full sm:w-auto text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !file || !selectedBranch || !selectedLocation || !title}
                className="px-8 py-2.5 bg-[#127958] hover:bg-[#169a70] text-emerald-50 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-center shadow-lg"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoManagement;
