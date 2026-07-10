import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../common/services/api';
import { BRANCH_LOCATIONS, BRANCHES } from '../../../common/utils';
import { Clock, Calendar, MapPin, Building2, User, ChevronRight, MonitorPlay } from 'lucide-react';
import logoImg from '../../../assets/kims-logo.png';

const DisplayScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branch = searchParams.get('branch');
  const location = searchParams.get('location');

  // Clock state
  const [time, setTime] = useState(new Date());
  
  // Roster state
  const [roster, setRoster] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Setup ticking clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch roster
  useEffect(() => {
    if (!branch || !location) return;

    const fetchRoster = async () => {
      try {
        setLoading(true);
        const res = await api.get('/roster/today', {
          params: { branch, location }
        });
        setRoster(res.data);
        setActiveIndex(0);
      } catch (err) {
        console.error('Error fetching display roster:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
    // Poll for changes every 30 seconds
    const pollTimer = setInterval(fetchRoster, 30000);
    return () => clearInterval(pollTimer);
  }, [branch, location]);

  // Slideshow rotation
  useEffect(() => {
    if (roster.length <= 1) return;

    const rotationTimer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % roster.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(rotationTimer);
  }, [roster]);

  // Handle display selection (for Super Admins/unspecified params)
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const launchSignage = (e) => {
    e.preventDefault();
    if (selectedBranch && selectedLocation) {
      navigate(`/display?branch=${encodeURIComponent(selectedBranch)}&location=${encodeURIComponent(selectedLocation)}`);
    }
  };

  const getFullPhotoUrl = (url) => {
    if (!url) return '';
    return `http://localhost:5000${url}`;
  };

  // Render selection panel if branch or location are missing
  if (!branch || !location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-slate-800/40 relative z-10 animate-slide-up">
          <div className="flex flex-col items-center text-center mb-6">
            <img src={logoImg} alt="KIMS" className="w-16 h-16 object-contain mb-3" />
            <h2 className="text-xl font-heading font-bold text-white">Launch Signage Board</h2>
            <p className="text-xs text-slate-400 mt-1">Select a targeting area to launch the TV broadcast board.</p>
          </div>

          <form onSubmit={launchSignage} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">BRANCH</label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedLocation('');
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 cursor-pointer"
              >
                <option value="">Select Branch</option>
                {BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">LOCATION</label>
              <select
                value={selectedLocation}
                disabled={!selectedBranch}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:outline-none text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">Select Location</option>
                {selectedBranch && BRANCH_LOCATIONS[selectedBranch].map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedBranch || !selectedLocation}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-500/50 disabled:text-slate-900/40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-400/5"
            >
              <MonitorPlay className="w-4 h-4" />
              Launch Display
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Format Clock elements
  const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const activeDoc = roster[activeIndex];

  return (
    <div className="min-h-screen bg-[#030611] text-white flex flex-col font-sans overflow-hidden select-none select-none relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header bar */}
      <header className="h-24 glass-panel border-b border-white/5 flex items-center justify-between px-10 z-10 shadow-lg shrink-0">
        {/* Left: Logo & Hospital Name */}
        <div className="flex items-center gap-4">
          <img src={logoImg} alt="KIMS Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="font-heading font-extrabold text-xl tracking-tight text-white leading-none">
              KALINGA INSTITUTE OF MEDICAL SCIENCES
            </h1>
            <p className="text-xs font-semibold text-emerald-400 tracking-wider mt-1 uppercase">BHUBANESWAR</p>
          </div>
        </div>

        {/* Center: Location badge */}
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-md">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold tracking-wide uppercase text-slate-100">
            {branch} &mdash; {location}
          </span>
        </div>

        {/* Right: Date & Time */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 text-slate-400 font-medium">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span className="text-sm tracking-wide">{dateString}</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2.5 text-white font-bold font-mono">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl tracking-wide">{timeString}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex p-10 gap-10 overflow-hidden relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-semibold text-lg tracking-wide">Syncing signage feeds...</p>
          </div>
        ) : roster.length > 0 ? (
          <>
            {/* Left: Active Doctor Card Showcase (60%) */}
            <div className="flex-[3] flex flex-col justify-center relative overflow-hidden h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDoc?.roster_id || activeIndex}
                  initial={{ opacity: 0, y: 30, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.98 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-[80%] glass-card rounded-[32px] border border-white/10 overflow-hidden shadow-2xl flex relative"
                >
                  {/* Glowing active outline */}
                  <div className="absolute inset-0 border-2 border-emerald-400/20 rounded-[32px] pointer-events-none shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]" />

                  {/* Doctor image container */}
                  <div className="w-[45%] h-full bg-slate-950/40 relative border-r border-white/5 overflow-hidden">
                    <img
                      src={getFullPhotoUrl(activeDoc?.photo_url)}
                      alt={activeDoc?.doctor_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c1224] to-transparent" />
                  </div>

                  {/* Doctor Info details */}
                  <div className="w-[55%] p-12 flex flex-col justify-between relative bg-gradient-to-br from-slate-900/60 to-slate-950/80">
                    <div className="space-y-6">
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-widest uppercase">
                        ON DUTY TODAY
                      </span>
                      
                      <div className="space-y-2">
                        <h2 className="text-4xl lg:text-5xl font-heading font-extrabold text-white tracking-tight leading-tight">
                          {activeDoc?.doctor_name}
                        </h2>
                        <p className="text-lg lg:text-xl font-medium text-slate-300">
                          {activeDoc?.designation}
                        </p>
                      </div>

                      <div className="h-[1px] w-2/3 bg-white/5" />

                      <div className="space-y-4">
                        {/* Department details */}
                        <div className="flex items-center gap-3 text-slate-350">
                          <Building2 className="w-5.5 h-5.5 text-emerald-400" />
                          <span className="text-base font-semibold">{activeDoc?.department_name}</span>
                        </div>

                        {/* Shift timing details */}
                        <div className="flex items-center gap-3 text-slate-350">
                          <Clock className="w-5.5 h-5.5 text-emerald-400" />
                          <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">CONSULTATION HOURS</p>
                            <p className="text-base font-bold text-emerald-400 mt-0.5">{activeDoc?.timing}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom slider dots */}
                    {roster.length > 1 && (
                      <div className="flex items-center gap-2 mt-auto">
                        {roster.map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              activeIndex === idx ? 'w-8 bg-emerald-400' : 'w-2 bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: Roster Queue Queue Preview List (40%) */}
            <div className="flex-[2] flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-extrabold uppercase text-slate-400 tracking-widest">TODAY'S LINEUP</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                  {roster.length} TOTAL
                </span>
              </div>

              {/* Scrolling container */}
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-2">
                {roster.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <motion.div
                      key={item.roster_id}
                      animate={{
                        borderColor: isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)',
                        backgroundColor: isActive ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      }}
                      className={`flex items-center justify-between p-4.5 rounded-2xl border transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.15)]`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Mini photo */}
                        <div className={`w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border flex-shrink-0 flex items-center justify-center transition-colors ${
                          isActive ? 'border-emerald-400/40' : 'border-slate-800'
                        }`}>
                          <img
                            src={getFullPhotoUrl(item.photo_url)}
                            alt={item.doctor_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {item.doctor_name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            {item.department_name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800/60'
                        }`}>
                          {item.timing}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Empty / Welcome state */
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-36 h-36 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-center p-4 mb-6 shadow-2xl">
              <img src={logoImg} alt="KIMS Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-4xl font-heading font-extrabold text-white tracking-tight mb-2">
              Welcome to KIMS Bhubaneswar
            </h2>
            <p className="text-slate-400 max-w-md mx-auto text-base">
              Clinical schedules for <span className="text-emerald-400 font-semibold uppercase">{branch} - {location}</span> will appear shortly. Please check back soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DisplayScreen;
