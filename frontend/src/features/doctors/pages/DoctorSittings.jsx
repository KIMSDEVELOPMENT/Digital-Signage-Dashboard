import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Save, X, Calendar } from 'lucide-react';
import api from '../../../common/services/api';
import toast from 'react-hot-toast';

const DoctorSittings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);

  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const searchDoctors = async (query) => {
    if (!query) {
      setDoctors([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/sittings/search?query=${encodeURIComponent(query)}`);
      setDoctors(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to search doctors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchDoctors(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    if (doc.display_days) {
      try {
        const parsedDays = typeof doc.display_days === 'string' ? JSON.parse(doc.display_days) : doc.display_days;
        setSelectedDays(Array.isArray(parsedDays) ? parsedDays : []);
      } catch (e) {
        setSelectedDays([]);
      }
    } else {
      setSelectedDays([]);
    }
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!selectedDoctor) return;
    setSaving(true);
    try {
      await api.post('/sittings', {
        employee_id: selectedDoctor.employee_id,
        display_days: selectedDays
      });
      toast.success('Sitting days saved successfully!');
      setSelectedDoctor(null);
      searchDoctors(searchQuery); // Refresh the list
    } catch (error) {
      console.error(error);
      toast.error('Failed to save sitting days.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Doctor Sitting Management</h1>
          <p className="text-slate-400 mt-1 text-lg">Manage display days for doctors on the digital signage.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-800/40">
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search doctors by Name or Employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 text-slate-200 font-medium placeholder-slate-500 transition-all focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => handleSelectDoctor(doc)}
                className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/20 cursor-pointer hover:border-emerald-500/60 hover:bg-slate-800/40 transition-all flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center">
                  {doc.photo_url ? (
                    <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon name={doc.name} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-200 truncate">{doc.name}</h3>
                  <p className="text-sm text-slate-400 truncate">{doc.designation}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">ID: {doc.employee_id}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(() => {
                      try {
                        const days = typeof doc.display_days === 'string' ? JSON.parse(doc.display_days) : doc.display_days;
                        if (Array.isArray(days) && days.length > 0) {
                          return days.map(d => (
                            <span key={d} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                              {d}
                            </span>
                          ));
                        }
                        return <span className="text-xs text-slate-400 italic">No days assigned</span>;
                      } catch(e) {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12 text-slate-500">
            No doctors found matching "{searchQuery}"
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            Type in the search box to find a doctor.
          </div>
        )}
      </div>

      {/* Edit Modal */}
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
                <p className="text-slate-300 mb-4">Select the days this doctor should be displayed on the screen:</p>
                
                <div className="grid grid-cols-2 gap-3">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2
                        ${selectedDays.includes(day) 
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm' 
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-emerald-500/40 hover:text-slate-300'
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

export default DoctorSittings;
