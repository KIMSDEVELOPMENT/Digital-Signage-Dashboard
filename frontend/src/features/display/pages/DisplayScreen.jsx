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

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateString = time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="w-1/5 text-right flex flex-col items-end text-white justify-center">
      <p className="text-3xl font-medium whitespace-nowrap drop-shadow-md" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{dateString}</p>
      <p className="text-7xl font-bold mt-1 tracking-tight drop-shadow-md" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{timeString}</p>
    </div>
  );
};

const DisplayScreen = () => {
  const { branch: paramBranch, location: paramLocation } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, getAssignedLocations, branches, branchLocations } = useAuth();

  const branch = paramBranch || searchParams.get('branch');
  const location = paramLocation || searchParams.get('location');
  const assignedLocs = getAssignedLocations() || [];

  const [playlist, setPlaylist] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!branch || !location) {
      if (user && user.role === 'normal_admin' && assignedLocs && assignedLocs.length > 0) {
        const targetBranch = assignedLocs[0].branch;
        const targetLoc = assignedLocs[0].location;
        navigate(`/display/${formatLocationForUrl(targetBranch)}/${formatLocationForUrl(targetLoc)}`, { replace: true });
      } else if (branches && branches.length > 0) {
        // Default to SSCC if available, otherwise first branch
        const targetBranch = branches.find(b => b.toUpperCase() === 'SSCC') || branches[0];
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
        @keyframes light-sweep {
          0% { transform: translateX(-50vw) skewX(-45deg) scaleX(1); opacity: 0; }
          25% { opacity: 0.25; transform: translateX(0vw) skewX(-40deg) scaleX(1.2); }
          50% { opacity: 0.1; transform: translateX(50vw) skewX(-45deg) scaleX(0.8); }
          75% { opacity: 0.25; transform: translateX(100vw) skewX(-50deg) scaleX(1.1); }
          100% { transform: translateX(150vw) skewX(-45deg) scaleX(1); opacity: 0; }
        }
        .animate-light-1 { animation: light-sweep 12s linear infinite; }
        .animate-light-2 { animation: light-sweep 18s linear infinite 5s; }
        .animate-light-3 { animation: light-sweep 24s linear infinite 11s; }
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

        const buildPages = (fetchedPlaylist, locLabel) => {
          const pages = [];
          if (fetchedPlaylist && fetchedPlaylist.steps) {
            fetchedPlaylist.steps.forEach(step => {
              if (step.departments && step.departments.length > 0) {
                step.departments.forEach(dept => {
                  const doctors = dept.doctors || [];
                  for (let i = 0; i < doctors.length; i += 3) {
                    pages.push({
                      stepTitle: step.title,
                      duration: step.duration || 10,
                      department: dept.name,
                      doctors: doctors.slice(i, i + 3),
                      locLabel
                    });
                  }
                });
              }
            });
          }
          return pages;
        };

        if (branch.toLowerCase() === 'sscc') {
          // Fetch both KSS/KCC playlists
          const [resKss, resKcc] = await Promise.all([
            api.get('/display/sscc/kss').catch(() => ({ data: null })),
            api.get('/display/sscc/kcc').catch(() => ({ data: null }))
          ]);

          const kssPlaylist = resKss.data || { branch: 'SSCC', steps: [] };
          const kccPlaylist = resKcc.data || { branch: 'SSCC', steps: [] };

          setPlaylist(kssPlaylist.branch ? kssPlaylist : kccPlaylist);

          let allPages = [];

          // Phase 1: Combined KSS + KCC (grouped by department)
          const combinedDepts = {};
          const processForCombined = (playlist) => {
            if (!playlist || !playlist.steps) return;
            playlist.steps.forEach(step => {
              if (step.departments) {
                step.departments.forEach(dept => {
                  if (!combinedDepts[dept.name]) combinedDepts[dept.name] = [];
                  combinedDepts[dept.name].push(...(dept.doctors || []));
                });
              }
            });
          };

          processForCombined(kssPlaylist);
          processForCombined(kccPlaylist);

          const combinedPages = [];
          Object.keys(combinedDepts).sort().forEach(deptName => {
            const doctors = combinedDepts[deptName];
            for (let i = 0; i < doctors.length; i += 3) {
              combinedPages.push({
                stepTitle: 'OPD SCHEDULED',
                duration: 10,
                department: deptName,
                doctors: doctors.slice(i, i + 3),
                locLabel: 'combined'
              });
            }
          });

          // Build Location Specific Pages (KSS or KCC)
          const locParam = formatLocationForUrl(location);
          let locationPages = [];
          if (locParam === 'kss') {
            locationPages = buildPages(kssPlaylist, 'kss');
          } else if (locParam === 'kcc') {
            locationPages = buildPages(kccPlaylist, 'kcc');
          } else {
            locationPages = [
              ...buildPages(kssPlaylist, 'kss'),
              ...buildPages(kccPlaylist, 'kcc')
            ];
          }

          // Aggregate and sort videos for the current location
          let allBranchVideos = [];
          if (locParam === 'kss') {
            allBranchVideos = [...(kssPlaylist.videos || [])];
          } else if (locParam === 'kcc') {
            allBranchVideos = [...(kccPlaylist.videos || [])];
          } else {
            allBranchVideos = [
              ...(kssPlaylist.videos || []),
              ...(kccPlaylist.videos || [])
            ];
          }
          allBranchVideos.sort((a, b) => a.playOrder - b.playOrder);

          if (allBranchVideos.length === 0) {
            // No videos: Just run the loop once without videos
            if (combinedPages.length > 0) allPages.push(...combinedPages);
            else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
            
            allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
            
            if (locationPages.length > 0) allPages.push(...locationPages);
            else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
            
            allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
          } else {
            // Pair up videos and loop the sequence
            for (let i = 0; i < allBranchVideos.length; i += 2) {
              const v1 = allBranchVideos[i];
              const v2 = allBranchVideos[i+1];

              // Slot 1: After Combined
              if (combinedPages.length > 0) allPages.push(...combinedPages);
              else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
              
              allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
              if (v1) allPages.push({ isVideo: true, duration: v1.duration, videoUrl: v1.url });

              // Slot 2: After Location
              if (locationPages.length > 0) allPages.push(...locationPages);
              else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
              
              allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
              if (v2) allPages.push({ isVideo: true, duration: v2.duration, videoUrl: v2.url });
            }
          }

          setPages(allPages);
          setCurrentPageIndex(0);
          setError(null);
        } else {
          // Normal logic for other branches
          const res = await api.get(`/display/${formatLocationForUrl(branch)}/${formatLocationForUrl(location)}`);
          const fetchedPlaylist = res.data;
          setPlaylist(fetchedPlaylist);

          const allPages = buildPages(fetchedPlaylist, null);
          if (allPages.length === 0) {
            allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
          }
          allPages.push({ isBanner: true, duration: 10 });
          if (fetchedPlaylist.videos && fetchedPlaylist.videos.length > 0) {
            fetchedPlaylist.videos.forEach(v => {
              allPages.push({ isVideo: true, duration: v.duration, videoUrl: v.url });
            });
          }

          setPages(allPages);
          setCurrentPageIndex(0);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching display playlist:', err);
        setError('Unable to load display configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();

    // Set up Server-Sent Events (SSE) for real-time updates
    const eventSource = new EventSource('http://localhost:5000/api/display/stream');

    eventSource.onmessage = (event) => {
      if (event.data === 'update') {
        console.log('Real-time update received, refreshing playlist...');
        fetchPlaylist();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      // EventSource will automatically attempt to reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [branch, location]);

  const goToNextPage = () => {
    setCurrentPageIndex((prev) => (prev + 1) % pages.length);
  };

  useEffect(() => {
    if (pages.length <= 1) return;
    const currentPage = pages[currentPageIndex];

    if (currentPage?.isVideo) {
      // For videos, wait generously (duration + 30s) as a fallback in case onEnded fails
      const fallbackDurationMs = (Number(currentPage.duration || 10) + 30) * 1000;
      const timer = setTimeout(goToNextPage, fallbackDurationMs);
      return () => clearTimeout(timer);
    }

    const durationMs = (currentPage?.duration || 10) * 1000;
    const timer = setTimeout(goToNextPage, durationMs);
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
        <Ambulance className="w-8 h-8 text-[#fbbd61]" fill="currentColor" />
        <span>AMBULANCE: 0674-7111333 / 7440 070010</span>
      </div>
      <span className="text-[#fbbd61]/70 font-light mx-8">|</span>
      <div className="flex items-center gap-3">
        <PhoneCall className="w-7 h-7 text-[#fbbd61]" fill="currentColor" />
        <span>HELLO KIMS: 0674 2304400 / 7111000</span>
      </div>
      <span className="text-[#fbbd61]/70 font-light mx-8">|</span>
      <div className="flex items-center gap-3">
        <PhoneCall className="w-7 h-7 text-[#fbbd61]" fill="currentColor" />
        <span>24X7 EMERGENCY: 0674 2725228 / 7105354</span>
      </div>
      <span className="text-[#fbbd61]/70 font-light mx-8">|</span>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-slate-900 overflow-hidden relative bg-white">
      {/* Background Image fills the screen */}
      {(!currentPage || (!currentPage.isBanner && !currentPage.isVideo)) && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImg})` }}
          />
          {/* Animated Light Sweep Background */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-screen">
            <div className="absolute top-0 -bottom-32 w-[30vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[50px] animate-light-1" />
            <div className="absolute -top-32 bottom-0 w-[40vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[60px] animate-light-2" />
            <div className="absolute top-1/4 -bottom-1/4 w-[25vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[40px] animate-light-3" />
          </div>
        </>
      )}


      {/* Header - Transparent background to show bg-image behind it */}
      {(!currentPage || (!currentPage.isBanner && !currentPage.isVideo)) && (
        <header className="flex items-center justify-between px-10 py-2 z-10 shrink-0 min-h-[120px] relative">

          {/* Left Spacer to shift logo leftwards */}
          <div className="w-[10%]"></div>

          {/* Center: Banner Logo */}
          <div className="flex-1 flex items-center justify-center px-4 drop-shadow-md">
            {isDental ? (
              <img src={kidsLogo} alt="KIDS Banner" className="w-full max-w-[1200px] max-h-[180px] object-contain brightness-0 invert" />
            ) : isSuperSpeciality ? (
              <img src={kssccLogo} alt="KSSCC Banner" className="w-full max-w-[1200px] max-h-[180px] object-contain brightness-0 invert" />
            ) : (
              <img src={kimsLogo} alt="KIMS Banner" className="w-full max-w-[1200px] max-h-[180px] object-contain brightness-0 invert" />
            )}
          </div>

          {/* Right Side: Date & Time */}
          <LiveClock />
        </header>
      )}


      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col z-10 overflow-hidden min-h-0 ${(!currentPage || (!currentPage.isBanner && !currentPage.isVideo)) ? 'px-12 py-6' : ''}`}>
        {currentPage && currentPage.isVideo ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black h-full w-full">
            <video
              src={getFullPhotoUrl(currentPage.videoUrl)}
              className="w-full h-full object-contain"
              autoPlay
              muted
              preload="auto"
              onEnded={goToNextPage}
              onError={goToNextPage}
            />
          </div>
        ) : currentPage && currentPage.isBanner ? (
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
                {/* Department Header */}
                <div className="text-center mb-8 w-full max-w-[85%] mx-auto flex items-center justify-center gap-4">
                  {/* Left Line */}
                  <div className="flex-1 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#fbbd61] mr-2 shrink-0"></div>
                    <div className="w-full h-[3px] bg-[#fbbd61]"></div>
                  </div>
                  
                  {/* Center Pill */}
                  <div className="bg-[#fbbd61] px-8 py-1.5 rounded-full shadow-md shrink-0">
                    <h3 className="text-[1.8rem] font-bold text-[#004d40] tracking-wide" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                      Department of {currentPage.department}
                    </h3>
                  </div>

                  {/* Right Line */}
                  <div className="flex-1 flex items-center">
                    <div className="w-full h-[3px] bg-[#fbbd61]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#fbbd61] ml-2 shrink-0"></div>
                  </div>
                </div>

                {/* List of Doctors */}
                <div className="flex-1 overflow-hidden flex flex-col gap-3 w-full mx-auto">
                  {currentPage.doctors.map((doc, docIdx) => (
                    <div
                      key={docIdx}
                      className="flex items-center bg-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-2xl border border-white/20 px-8 py-6"
                    >
                      <div className="flex items-center gap-8 w-[45%]">
                        <div className="w-36 h-36 rounded-full overflow-hidden bg-white border-[4px] border-[#fbbd61] shadow-md flex-shrink-0">
                          {doc.photo_url ? (
                            <img src={getFullPhotoUrl(doc.photo_url)} alt={doc.name} className="w-full h-full object-contain p-1 bg-white rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-[#1c4587]/10 flex items-center justify-center">
                              <span className="text-[#1c4587] font-bold text-6xl">{doc.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col drop-shadow-md">
                          <h3 className="text-3xl font-bold text-white tracking-wide leading-tight" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                            {doc.name.replace(/^Dr\.?\s*/i, 'Dr. ').replace(/(Dr\.\s*)(.*)/i, (_, prefix, name) => prefix + name.toUpperCase())}
                          </h3>
                          <p className="text-xl font-bold text-[#fbbd61] uppercase tracking-widest mt-1 leading-snug">{doc.designation}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-start gap-3 text-[#fbbd61] px-6 py-2 rounded-lg bg-transparent font-bold text-4xl w-[25%] -ml-12 drop-shadow-md" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        <Clock className="w-9 h-9 opacity-90" />
                        {doc.timing}
                      </div>

                      <div className="flex justify-end gap-2 w-[30%]">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => {
                            let parsedDays = doc.display_days ? (typeof doc.display_days === 'string' ? JSON.parse(doc.display_days) : doc.display_days) : [];
                            let branchDays = [];
                            if (Array.isArray(parsedDays)) {
                              branchDays = parsedDays;
                            } else if (parsedDays && typeof parsedDays === 'object') {
                              const currentBranch = branch ? branch.toUpperCase() : 'SSCC';
                              branchDays = parsedDays[currentBranch] || [];
                            }
                            const isActive = branchDays.includes(day);
                            return (
                              <span 
                                key={day} 
                                className={`px-2.5 py-1.5 rounded-lg text-base border-2 uppercase tracking-wide transition-all duration-300 shadow-sm ${
                                  isActive 
                                    ? 'bg-[#fbbd61] text-[#004d40] font-extrabold border-[#fbbd61]' 
                                    : 'bg-transparent text-white/40 font-semibold border-[#fbbd61]/40'
                                }`}
                              >
                                {day}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


              </motion.div>
            </AnimatePresence>

            {/* Copyright */}
            <div className="text-center mt-auto pt-6 text-[#627a94] text-sm pb-4 font-medium tracking-wide">
              © 2026 KIMS ICT. All Rights Reserved.
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
      {(!currentPage || (!currentPage.isBanner && !currentPage.isVideo)) && (
        <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 text-white py-5 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.2)] z-10 overflow-hidden flex items-center">
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

