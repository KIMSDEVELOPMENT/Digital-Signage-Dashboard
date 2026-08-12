import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorPlay } from 'lucide-react';
import { useAuth } from '../../../app/context/AuthContext';
import { getBranchConfig } from '../config/branchRegistry';
import { useDisplayPlaylist } from '../hooks/useDisplayPlaylist';
import DisplayHeader from '../components/DisplayHeader';
import DisplayFooter from '../components/DisplayFooter';
import DepartmentHeader from '../components/DepartmentHeader';
import DoctorCard from '../components/DoctorCard';
import bannerImg from '../../../common/assets/Banner.png';
import bgImg from '../../../common/assets/bg.png';

const formatLocationForUrl = (loc) => {
  if (!loc) return '';
  return loc.toLowerCase().replace(/[\s/]+/g, '-').replace(/-+/g, '-');
};

// ─── Inject display-screen CSS once ──────────────────────────────────────────
const injectDisplayStyles = () => {
  const style = document.createElement('style');
  style.id = 'display-screen-styles';
  style.innerHTML = `
    body, html { overflow: hidden !important; background-color: #f8fafc; }
    ::-webkit-scrollbar { display: none !important; }
    @keyframes marquee {
      0%   { transform: translateX(100vw); }
      100% { transform: translateX(-100%); }
    }
    .animate-marquee { animation: marquee 45s linear infinite; }
    .animate-marquee:hover { animation-play-state: paused; }
    @keyframes light-sweep {
      0%   { transform: translateX(-50vw) skewX(-45deg) scaleX(1); opacity: 0; }
      25%  { opacity: 0.5; transform: translateX(0vw) skewX(-40deg) scaleX(1.2); }
      50%  { opacity: 0.2; transform: translateX(50vw) skewX(-45deg) scaleX(0.8); }
      75%  { opacity: 0.5; transform: translateX(100vw) skewX(-50deg) scaleX(1.1); }
      100% { transform: translateX(150vw) skewX(-45deg) scaleX(1); opacity: 0; }
    }
    .animate-light-1 { animation: light-sweep 8s linear infinite; }
    .animate-light-2 { animation: light-sweep 12s linear infinite 3s; }
    .animate-light-3 { animation: light-sweep 16s linear infinite 6s; }
  `;
  if (!document.getElementById('display-screen-styles')) {
    document.head.appendChild(style);
  }
  return () => {
    const el = document.getElementById('display-screen-styles');
    if (el) el.remove();
  };
};
// ─────────────────────────────────────────────────────────────────────────────

const DisplayScreen = () => {
  const { branch: paramBranch, location: paramLocation } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, getAssignedLocations, branches, branchLocations } = useAuth();

  const branch = paramBranch || searchParams.get('branch');
  const location = paramLocation || searchParams.get('location');
  const assignedLocs = getAssignedLocations() || [];

  // Resolve branch config (theme + playlist builder) from registry
  const config = getBranchConfig(branch);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // All data/SSE logic lives in the hook — DisplayScreen stays clean
  const { pages, playlist, loading, error } = useDisplayPlaylist(branch, location);

  // Redirect to a valid branch/location if none is specified in the URL
  useEffect(() => {
    if (!branch || !location) {
      if (user && user.role === 'normal_admin' && assignedLocs.length > 0) {
        const { branch: tb, location: tl } = assignedLocs[0];
        navigate(`/display/${formatLocationForUrl(tb)}/${formatLocationForUrl(tl)}`, { replace: true });
      } else if (branches && branches.length > 0) {
        const targetBranch = branches.find(b => b.toUpperCase() === 'SSCC') || branches[0];
        const targetLoc = (branchLocations?.[targetBranch]?.[0]) || 'main';
        navigate(`/display/${formatLocationForUrl(targetBranch)}/${formatLocationForUrl(targetLoc)}`, { replace: true });
      }
    }
  }, [branch, location, user, assignedLocs, branches, branchLocations, navigate]);

  // Inject global CSS for the display screen
  useEffect(() => {
    if (branch && location) return injectDisplayStyles();
  }, [branch, location]);

  // Reset page index when playlist changes
  useEffect(() => {
    setCurrentPageIndex(0);
  }, [pages]);

  // Auto-advance pages
  useEffect(() => {
    if (pages.length <= 1) return;
    const currentPage = pages[currentPageIndex];
    const goToNext = () => setCurrentPageIndex(prev => (prev + 1) % pages.length);

    const durationMs = currentPage?.isVideo
      ? (Number(currentPage.duration || 10) + 30) * 1000  // generous fallback for videos
      : (currentPage?.duration || 10) * 1000;

    const timer = setTimeout(goToNext, durationMs);
    return () => clearTimeout(timer);
  }, [currentPageIndex, pages]);

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (!branch || !location || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#3478c9]" />
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
  const goToNext = () => setCurrentPageIndex(prev => (prev + 1) % pages.length);
  const isContentPage = !currentPage?.isBanner && !currentPage?.isVideo;

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-slate-900 overflow-hidden relative bg-white">

      {/* Background image + animated light sweeps (only on content pages) */}
      {isContentPage && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImg})` }}
          />
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-screen">
            <div className="absolute top-0 -bottom-32 w-[30vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[50px] animate-light-1" />
            <div className="absolute -top-32 bottom-0 w-[40vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[60px] animate-light-2" />
            <div className="absolute top-1/4 -bottom-1/4 w-[25vw] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 blur-[40px] animate-light-3" />
          </div>
        </>
      )}

      {/* Header — uses config.theme.logo, no branch flags */}
      {isContentPage && <DisplayHeader theme={config.theme} />}

      {/* Main content */}
      <main className={`flex-1 flex flex-col z-10 overflow-hidden min-h-0 ${isContentPage ? 'px-14 py-8' : ''}`}>

        {/* Video page */}
        {currentPage?.isVideo && (
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black h-full w-full">
            <video
              src={`http://${window.location.hostname}:5000${currentPage.videoUrl}`}
              className="w-full h-full object-contain"
              autoPlay
              muted
              preload="auto"
              onEnded={goToNext}
              onError={goToNext}
            />
          </div>
        )}

        {/* Banner / promotional image page */}
        {currentPage?.isBanner && (
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
        )}

        {/* Doctor schedule page */}
        {isContentPage && currentPage?.doctors?.length > 0 && (
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
                {/* Department pill header */}
                <DepartmentHeader department={currentPage.department} theme={config.theme} />

                {/* Doctor cards */}
                <div className="flex-1 overflow-hidden flex flex-col gap-3 w-full mx-auto">
                  {currentPage.doctors.map((doc, idx) => (
                    <DoctorCard
                      key={idx}
                      doc={doc}
                      branch={branch}
                      location={location}
                      theme={config.theme}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="text-center mt-auto pt-6 text-[#627a94] text-sm pb-4 font-medium tracking-wide">
              © 2026 KIMS ICT. All Rights Reserved.
            </div>
          </div>
        )}

        {/* Empty state */}
        {isContentPage && (!currentPage?.doctors || currentPage.doctors.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-32 h-32 mb-6 opacity-20">
              <MonitorPlay className="w-full h-full text-[#1c4587]" />
            </div>
            <h3 className="text-3xl font-bold text-[#1c4587]">No schedules available</h3>
            <p className="text-slate-600 text-xl mt-4">
              There are no doctors scheduled for {currentPage?.stepTitle || 'this step'} today.
            </p>
          </div>
        )}
      </main>

      {/* Footer — uses config.theme.footerNumbers, no hardcoded strings */}
      {isContentPage && <DisplayFooter theme={config.theme} />}
    </div>
  );
};

export default DisplayScreen;
