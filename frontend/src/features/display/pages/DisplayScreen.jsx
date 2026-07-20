import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../app/context/AuthContext';
import api from '../../../common/services/api';
import { Clock, MonitorPlay, PhoneCall, Ambulance } from 'lucide-react';

// Using the exact asset names requested
import bgImg from '../../../common/assets/bg.png';
import kimsLogo from '../../../common/assets/kims-logo.png';
import kiitLogo from '../../../common/assets/kiit-logo.png';
import kidsLogo from '../../../common/assets/kids-logo.png';
import kssccLogo from '../../../common/assets/ksscc-logo.png';
import bannerImg from '../../../common/assets/Banner.png';

const formatLocationForUrl = (loc) => {
  if (!loc) return '';
  return loc.toLowerCase().replace(/[\s/]+/g, '-').replace(/-+/g, '-');
};

const DisplayScreen = () => {
  const { branch: paramBranch, location: paramLocation } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, getAssignedLocations, branches, branchLocations } = useAuth();

  const branch = paramBranch || searchParams.get('branch');
  const location = paramLocation || searchParams.get('location');
  const assignedLocs = getAssignedLocations() || [];

  const [time, setTime] = useState(new Date());
  const [playlist, setPlaylist] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!branch || !location) {
      if (user && user.role === 'normal_admin' && assignedLocs && assignedLocs.length > 0) {
        const targetBranch = assignedLocs[0].branch;
        const targetLoc = assignedLocs[0].location;
        navigate(`/display/${formatLocationForUrl(targetBranch)}/${formatLocationForUrl(targetLoc)}`, { replace: true });
      } else if (branches && branches.length > 0) {
        const targetBranch = branches[0];
        const targetLoc = (branchLocations && branchLocations[targetBranch] && branchLocations[targetBranch][0]) ? branchLocations[targetBranch][0] : 'main';
        navigate(`/display/${formatLocationForUrl(targetBranch)}/${formatLocationForUrl(targetLoc)}`, { replace: true });
      }
    }
  }, [branch, location, user, assignedLocs, branches, branchLocations, navigate]);

  useEffect(() => {
    if (branch && location) {
      const style = document.createElement('style');
      style.innerHTML = `
        body, html { overflow: hidden !important; background-color: #f8fafc; }
        ::-webkit-scrollbar { display: none !important; }
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, [branch, location]);

  useEffect(() => {
    if (!branch || !location) return;

    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/display/${formatLocationForUrl(branch)}/${formatLocationForUrl(location)}`);

        const fetchedPlaylist = res.data;
        setPlaylist(fetchedPlaylist);

        // Transform steps into chunked pages
        const allPages = [];
        if (fetchedPlaylist && fetchedPlaylist.steps) {
          fetchedPlaylist.steps.forEach(step => {
            if (!step.departments || step.departments.length === 0) {
              allPages.push({
                stepTitle: step.title,
                duration: step.duration || 10,
                department: null,
                doctors: []
              });
            } else {
              step.departments.forEach(dept => {
                const doctors = dept.doctors || [];
                for (let i = 0; i < doctors.length; i += 3) {
                  const chunk = doctors.slice(i, i + 3);
                  allPages.push({
                    stepTitle: step.title,
                    duration: step.duration || 10,
                    department: dept.name,
                    doctors: chunk
                  });
                }
              });
            }
          });
        }

        if (allPages.length === 0) {
          allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
        }

        allPages.push({ isBanner: true, duration: 10 });

        setPages(allPages);
        setCurrentPageIndex(0);
        setError(null);
      } catch (err) {
        console.error('Error fetching display playlist:', err);
        setError('Unable to load display configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
    const pollTimer = setInterval(fetchPlaylist, 300000); // 5 minutes
    return () => clearInterval(pollTimer);
  }, [branch, location]);

  useEffect(() => {
    if (pages.length <= 1) return;
    const currentPage = pages[currentPageIndex];
    const durationMs = (currentPage?.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentPageIndex((prev) => (prev + 1) % pages.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentPageIndex, pages]);

  const getFullPhotoUrl = (url) => {
    if (!url) return '';
    return `http://localhost:5000${url}`;
  };

  if (!branch || !location || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#3478c9]"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#3478c9]">
        <h2 className="text-2xl font-bold">{error || 'No playlist found for this screen.'}</h2>
        <p className="mt-2 text-gray-500">Please configure the display in the admin panel.</p>
      </div>
    );
  }

  const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateString = time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const currentPage = pages[currentPageIndex];

  // Dynamic Header Configuration
  let isDental = false;
  let isSuperSpeciality = false;

  const branchNameUpper = (playlist.branch || '').toUpperCase();
  if (branchNameUpper.includes('DENTAL') || branchNameUpper.includes('KIDS')) {
    isDental = true;
  } else if (branchNameUpper.includes('CANCER') || branchNameUpper.includes('SSCC') || branchNameUpper.includes('SUPER')) {
    isSuperSpeciality = true;
  }

  const FooterContent = () => (
    <>
      <div className="flex items-center gap-3">
        <Ambulance className="w-8 h-8 text-pink-200" fill="currentColor" />
        <span>AMBULANCE: 0674-7111333 / 7440 070010</span>
      </div>
      <span className="text-white/50 font-light mx-8">|</span>
      <div className="flex items-center gap-3">
        <PhoneCall className="w-7 h-7 text-pink-200" fill="currentColor" />
        <span>HELLO KIMS: 0674 2304400 / 7111000</span>
      </div>
      <span className="text-white/50 font-light mx-8">|</span>
      <div className="flex items-center gap-3">
        <PhoneCall className="w-7 h-7 text-pink-200" fill="currentColor" />
        <span>24X7 EMERGENCY: 0674 2725228 / 7105354</span>
      </div>
      <span className="text-white/50 font-light mx-8">|</span>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-slate-900 overflow-hidden relative bg-white">
      {/* Background Image fills the screen */}
      {(!currentPage || !currentPage.isBanner) && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImg})` }}
        />
      )}


      {/* Header - Transparent background to show bg-image behind it */}
      {(!currentPage || !currentPage.isBanner) && (
        <header className="flex items-center justify-between px-10 py-6 z-10 shrink-0 min-h-[160px]">

          {/* Left Spacer for perfect center alignment */}
          <div className="w-1/4"></div>

          {/* Center: Banner Logo */}
          <div className="flex-1 flex items-center justify-center px-4">
            {isDental ? (
              <img src={kidsLogo} alt="KIDS Banner" className="w-full max-w-[900px] max-h-[180px] object-contain mix-blend-darken opacity-80" />
            ) : isSuperSpeciality ? (
              <img src={kssccLogo} alt="KSSCC Banner" className="w-full max-w-[900px] max-h-[180px] object-contain mix-blend-darken opacity-80" />
            ) : (
              <img src={kimsLogo} alt="KIMS Banner" className="w-full max-w-[900px] max-h-[180px] object-contain mix-blend-darken opacity-80" />
            )}
          </div>

          {/* Right Side: Date & Time */}
          <div className="w-1/4 text-right flex flex-col items-end text-[#1c4587] justify-center">
            <p className="text-2xl font-medium whitespace-nowrap" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{dateString}</p>
            <p className="text-7xl font-bold mt-1 tracking-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{timeString}</p>
          </div>
        </header>
      )}

      {/* Title Bar */}
      {(!currentPage || !currentPage.isBanner) && (
        <div className="w-full bg-[#3478c9] text-white text-center py-2 z-10 shadow-md shrink-0">
          <h2 className="text-3xl font-bold tracking-widest uppercase">OPD SCHEDULED</h2>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col z-10 overflow-hidden min-h-0 ${(!currentPage || !currentPage.isBanner) ? 'px-12 py-6' : ''}`}>
        {currentPage && currentPage.isBanner ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="banner-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex items-center justify-center overflow-hidden min-h-0"
            >
              <img src={bannerImg} alt="KIMS Banner" className="w-full h-full object-fill" />
            </motion.div>
          </AnimatePresence>
        ) : currentPage && currentPage.doctors.length > 0 ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="flex-1 flex flex-col"
              >
                {/* Department Header (e.g. • NEUROLOGY •) */}
                <div className="text-center mb-6">
                  <h3 className="text-[2.5rem] font-bold text-[#1c4587] tracking-[0.3em] uppercase" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    {currentPage.department}
                  </h3>
                </div>

                {/* List of Doctors */}
                <div className="flex-1 overflow-hidden flex flex-col gap-6 w-full mx-auto">
                  {currentPage.doctors.map((doc, docIdx) => (
                    <div
                      key={docIdx}
                      className="flex items-center justify-between bg-white/30 backdrop-blur-sm rounded-[40px] border border-white/20 px-8 py-4"
                    >
                      <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-[3px] border-[#a0c8f0] shadow-sm flex-shrink-0">
                          {doc.photo_url ? (
                            <img src={getFullPhotoUrl(doc.photo_url)} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#1c4587]/10 flex items-center justify-center">
                              <span className="text-[#1c4587] font-bold text-3xl">{doc.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-3xl font-bold text-[#103061] tracking-wide" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{doc.name}</h3>
                          <p className="text-lg text-[#4a6b8c] font-semibold uppercase tracking-widest mt-1">{doc.designation}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[#103061] px-6 py-2 rounded-lg bg-transparent font-bold text-2xl">
                        <Clock className="w-6 h-6 opacity-70" />
                        {doc.timing}
                      </div>
                    </div>
                  ))}
                </div>


              </motion.div>
            </AnimatePresence>

            {/* Disclaimer */}
            <div className="text-center mt-auto pt-6 text-[#627a94] text-xs pb-4">
              <span className="inline-flex items-center justify-center w-3 h-3 border border-[#627a94] rounded-full mr-1 text-[8px]">i</span>
              Consultation timings are subject to change.
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-32 h-32 mb-6 opacity-20"><MonitorPlay className="w-full h-full text-[#1c4587]" /></div>
            <h3 className="text-3xl font-bold text-[#1c4587]">No schedules available</h3>
            <p className="text-slate-600 text-xl mt-4">There are no doctors scheduled for {currentPage?.stepTitle || 'this step'} today.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      {(!currentPage || !currentPage.isBanner) && (
        <footer className="bg-[#5993df] text-white py-5 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden flex items-center">
          <div className="flex items-center w-max animate-marquee text-2xl font-bold tracking-wide whitespace-nowrap">
            <FooterContent />
            <FooterContent />
            <FooterContent />
            <FooterContent />
            <FooterContent />
          </div>
        </footer>
      )}
    </div>
  );
};

export default DisplayScreen;

