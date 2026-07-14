import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Clock, Calendar, MapPin, Building2, User, MonitorPlay } from 'lucide-react';
import logoImg from '../../../common/assets/kims-logo.png';

const formatLocationForUrl = (loc) => {
  if (!loc) return '';
  return loc
    .toUpperCase()
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-');
};

const DisplayScreen = () => {
  const { branch: paramBranch, location: paramLocation } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, getAssignedLocations, branches, branchLocations } = useAuth();

  const branch = paramBranch || searchParams.get('branch');
  const location = paramLocation || searchParams.get('location');

  const assignedLocs = getAssignedLocations() || [];

  // Clock state
  const [time, setTime] = useState(new Date());
  
  // Roster state
  const [roster, setRoster] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ref to keep track of roster to prevent polling re-renders
  const rosterRef = useRef([]);

  // Selection state
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Clock ticking
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic redirect if normal admin has exactly one location privilege
  useEffect(() => {
    if (user && user.role === 'normal_admin' && (!branch || !location)) {
      if (assignedLocs.length === 1) {
        const targetBranch = assignedLocs[0].branch;
        const targetLoc = assignedLocs[0].location;
        navigate(`/display/${targetBranch}/${formatLocationForUrl(targetLoc)}`);
      }
    }
  }, [user, branch, location, assignedLocs, navigate]);

  // Global scrollbar hiding for TV display
  useEffect(() => {
    if (branch && location) {
      const style = document.createElement('style');
      style.innerHTML = `
        body, html {
          overflow: hidden !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [branch, location]);

  // Fetch and poll roster
  useEffect(() => {
    if (!branch || !location) return;

    const fetchRoster = async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const res = await api.get('/roster/today', {
          params: { branch, location }
        });

        // Prevent flicker by only updating state when roster data changes
        const resDataStr = JSON.stringify(res.data);
        const currentDataStr = JSON.stringify(rosterRef.current);
        if (resDataStr !== currentDataStr) {
          setRoster(res.data);
          rosterRef.current = res.data;
          setActiveIndex(0);
        }
      } catch (err) {
        console.error('Error fetching display roster:', err);
      } finally {
        if (!isPoll) setLoading(false);
      }
    };

    fetchRoster(false);

    // Polling every 10 seconds for real-time roster changes
    const pollTimer = setInterval(() => fetchRoster(true), 10000);
    return () => clearInterval(pollTimer);
  }, [branch, location]);

  // Group and partition doctors by department (max 3 doctors per page)
  const getPages = () => {
    const deptGroups = {};
    roster.forEach(doc => {
      const dept = doc.department_name;
      if (!deptGroups[dept]) {
        deptGroups[dept] = [];
      }
      deptGroups[dept].push(doc);
    });

    const pages = [];
    Object.keys(deptGroups).sort().forEach(dept => {
      const docs = deptGroups[dept];
      const chunkSize = 3;
      for (let i = 0; i < docs.length; i += chunkSize) {
        pages.push({
          department: dept,
          pageIndex: Math.floor(i / chunkSize) + 1,
          totalPages: Math.ceil(docs.length / chunkSize),
          doctors: docs.slice(i, i + chunkSize)
        });
      }
    });

    return pages;
  };

  const pages = getPages();

  // Rotation logic - 4 second delay
  useEffect(() => {
    if (pages.length <= 1) return;

    const rotationTimer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % pages.length);
    }, 4000);

    return () => clearInterval(rotationTimer);
  }, [pages.length]);

  // Background Image Preloading
  useEffect(() => {
    if (pages.length === 0) return;
    const nextPageIndex = (activeIndex + 1) % pages.length;
    const nextSlide = pages[nextPageIndex];
    if (nextSlide && nextSlide.doctors) {
      nextSlide.doctors.forEach(doc => {
        if (doc.photo_url) {
          const img = new Image();
          img.src = `http://localhost:5000${doc.photo_url}`;
        }
      });
    }
  }, [activeIndex, pages]);

  // Filter dropdown selections based on user privilege
  let displayBranches = branches;
  let displayLocations = [];

  if (user && user.role === 'normal_admin') {
    const uniqueBranches = Array.from(new Set(assignedLocs.map(al => al.branch)));
    displayBranches = uniqueBranches;
    if (selectedBranch) {
      displayLocations = assignedLocs
        .filter(al => al.branch.toLowerCase() === selectedBranch.toLowerCase())
        .map(al => al.location);
    }
  } else {
    displayBranches = branches;
    if (selectedBranch) {
      displayLocations = branchLocations[selectedBranch] || [];
    }
  }

  const launchSignage = (e) => {
    e.preventDefault();
    if (selectedBranch && selectedLocation) {
      navigate(`/display/${selectedBranch}/${formatLocationForUrl(selectedLocation)}`);
    }
  };

  const getFullPhotoUrl = (url) => {
    if (!url) return '';
    return `http://localhost:5000${url}`;
  };

  // Header Branding dynamic adaptation
  const getBranding = (b) => {
    if (!b) return { title: 'KIMS DIGITAL SIGNAGE SYSTEM', subtitle: 'HOSPITAL BOARD' };
    const upper = b.toUpperCase();
    if (upper === 'PBMH') {
      return {
        title: 'Pradyumna Bal Memorial Hospital',
        subtitle: 'KIMS'
      };
    } else if (upper === 'SSCC') {
      return {
        title: 'KIMS Super Speciality & Cancer Centre',
        subtitle: 'SSCC'
      };
    } else if (upper === 'DENTAL' || upper === 'KIDS') {
      return {
        title: 'Kalinga Institute of Dental Sciences',
        subtitle: 'KIDS'
      };
    }
    return {
      title: 'Kalinga Institute of Medical Sciences',
      subtitle: b.toUpperCase()
    };
  };

  // Get resolved locations from DB lookup
  const getDisplayLocation = (b, loc) => {
    if (!loc) return '';
    const targetNorm = loc.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const branchLocationsForBranch = branchLocations[b];
    if (branchLocationsForBranch) {
      const matched = branchLocationsForBranch.find(l => l.toUpperCase().replace(/[^A-Z0-9]/g, '') === targetNorm);
      if (matched) return matched;
    }
    return loc.replace(/-/g, ' ').toUpperCase();
  };

  // Render selection dashboard if branch or location are not specified
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
                {displayBranches.map(b => (
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
                {displayLocations.map(loc => (
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

  const branding = getBranding(branch);
  const activePage = pages[activeIndex];

  return (
    <div className="min-h-screen bg-[#030611] text-white flex flex-col font-sans overflow-hidden select-none relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header bar */}
      <header className="h-24 glass-panel border-b border-white/5 flex items-center justify-between px-10 z-10 shadow-lg shrink-0">
        {/* Left: Dynamic logo & Hospital Title */}
        <div className="flex items-center gap-4">
          <img src={logoImg} alt="KIMS Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="font-heading font-extrabold text-xl tracking-tight text-white leading-none">
              {branding.title}
            </h1>
            <p className="text-xs font-semibold text-emerald-400 tracking-wider mt-1.5 uppercase">{branding.subtitle}</p>
          </div>
        </div>

        {/* Center: Location badge */}
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-md">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold tracking-wide uppercase text-slate-100">
            {branch} &mdash; {getDisplayLocation(branch, location)}
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
      <main className="flex-1 flex p-10 overflow-hidden relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-semibold text-lg tracking-wide animate-pulse">Syncing signage feeds...</p>
          </div>
        ) : activePage ? (
          <div className="flex-1 flex flex-col h-full min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="w-full flex flex-col h-full min-h-0 space-y-6"
              >
                {/* Department Title & Paging */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                  <h2 className="text-3xl lg:text-4xl font-heading font-extrabold tracking-tight text-white flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-emerald-400" />
                    {activePage.department.toUpperCase()}
                  </h2>
                  <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-bold">
                    Page {activePage.pageIndex} of {activePage.totalPages}
                  </span>
                </div>

                {/* Doctors Grid on active page */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden py-2">
                  {activePage.doctors.map((doc) => (
                    <div 
                      key={doc.roster_id}
                      className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-full bg-slate-900/40 relative"
                    >
                      {/* Decorative border */}
                      <div className="absolute inset-0 border border-emerald-400/10 rounded-3xl pointer-events-none" />
                      
                      {/* Doctor Photo */}
                      <div className="h-64 xl:h-72 w-full bg-slate-950/60 relative overflow-hidden flex-shrink-0">
                        {doc.photo_url ? (
                          <img 
                            src={getFullPhotoUrl(doc.photo_url)} 
                            alt={doc.doctor_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <User className="w-20 h-20 text-slate-700" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#030611] to-transparent" />
                      </div>

                      {/* Doctor Details */}
                      <div className="p-6 xl:p-8 flex flex-col justify-between flex-1 min-h-0 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xl xl:text-2xl font-extrabold text-white tracking-tight leading-tight">
                            {doc.doctor_name}
                          </h3>
                          <p className="text-sm xl:text-base font-medium text-slate-400">
                            {doc.designation}
                          </p>
                        </div>
                        
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">SHIFT TIMING</span>
                          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
                            <Clock className="w-4 h-4" />
                            {doc.timing}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Global navigation dots under department sequence */}
            {pages.length > 1 && (
              <div className="flex items-center justify-center gap-2.5 mt-6 py-2 flex-shrink-0">
                {pages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      activeIndex === idx ? 'w-8 bg-emerald-400' : 'w-2.5 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Welcome default state when roster is empty */
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-36 h-36 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-center p-4 mb-6 shadow-2xl">
              <img src={logoImg} alt="KIMS Logo" className="w-full h-full object-contain animate-pulse" />
            </div>
            <h2 className="text-4xl font-heading font-extrabold text-white tracking-tight mb-2">
              Welcome to {branding.title}
            </h2>
            <p className="text-slate-400 max-w-md mx-auto text-base">
              Clinical schedules for <span className="text-emerald-400 font-semibold uppercase">{branch} - {getDisplayLocation(branch, location)}</span> will appear shortly. Please check back soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DisplayScreen;
