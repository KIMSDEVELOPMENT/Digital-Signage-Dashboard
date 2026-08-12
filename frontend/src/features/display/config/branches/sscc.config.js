import kssccLogo from '../../../../common/assets/ksscc-logo.png';
import api from '../../../../common/services/api';

const formatSlug = (val) => {
  if (!val) return '';
  return val.toLowerCase().replace(/[\s/]+/g, '-').replace(/-+/g, '-');
};

const buildPagesFromPlaylist = (fetchedPlaylist, locLabel) => {
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
              locLabel,
            });
          }
        });
      }
    });
  }
  return pages;
};

export const ssccConfig = {
  id: 'sscc',
  displayName: 'KIMS Super Speciality Cancer Centre',

  theme: {
    accentColor: '#fbbd61',
    bgPrimary: '#004d40',
    textPrimary: '#ffffff',
    logo: kssccLogo,
    footerNumbers: [
      { label: 'AMBULANCE', number: '0674-7111333 / 7440 070010' },
      { label: 'HELLO KIMS', number: '0674 2304400 / 7111000' },
      { label: '24X7 EMERGENCY', number: '0674 2725228 / 7105354' },
    ],
  },

  /**
   * SSCC-specific builder: fetches both KSS and KCC playlists, merges them into a
   * combined view + individual location view, interleaved with videos.
   * Extracted from DisplayScreen.jsx lines 133–240.
   */
  async buildPages(branch, location) {
    const [resKss, resKcc] = await Promise.all([
      api.get('/display/sscc/kss').catch(() => ({ data: null })),
      api.get('/display/sscc/kcc').catch(() => ({ data: null })),
    ]);

    const kssPlaylist = resKss.data || { branch: 'SSCC', steps: [] };
    const kccPlaylist = resKcc.data || { branch: 'SSCC', steps: [] };

    const playlist = kssPlaylist.branch ? kssPlaylist : kccPlaylist;

    // Phase 1: Build combined KSS + KCC pages (grouped by department)
    const combinedDepts = {};
    const processForCombined = (pl) => {
      if (!pl || !pl.steps) return;
      pl.steps.forEach(step => {
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
          locLabel: 'combined',
        });
      }
    });

    // Phase 2: Build location-specific pages
    const locParam = formatSlug(location);
    let locationPages = [];
    if (locParam === 'kss') {
      locationPages = buildPagesFromPlaylist(kssPlaylist, 'kss');
    } else if (locParam === 'kcc') {
      locationPages = buildPagesFromPlaylist(kccPlaylist, 'kcc');
    } else {
      locationPages = [
        ...buildPagesFromPlaylist(kssPlaylist, 'kss'),
        ...buildPagesFromPlaylist(kccPlaylist, 'kcc'),
      ];
    }

    // Phase 3: Aggregate videos for the current location
    let allBranchVideos = [];
    if (locParam === 'kss') {
      allBranchVideos = [...(kssPlaylist.videos || [])];
    } else if (locParam === 'kcc') {
      allBranchVideos = [...(kccPlaylist.videos || [])];
    } else {
      allBranchVideos = [
        ...(kssPlaylist.videos || []),
        ...(kccPlaylist.videos || []),
      ];
    }
    allBranchVideos.sort((a, b) => a.playOrder - b.playOrder);

    // Phase 4: Interleave combined + location pages with videos
    const allPages = [];
    if (allBranchVideos.length === 0) {
      // No videos — just run both views once
      if (combinedPages.length > 0) allPages.push(...combinedPages);
      else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
      allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });

      if (locationPages.length > 0) allPages.push(...locationPages);
      else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
      allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
    } else {
      // Pair videos and interleave with page slots
      for (let i = 0; i < allBranchVideos.length; i += 2) {
        const v1 = allBranchVideos[i];
        const v2 = allBranchVideos[i + 1];

        // Slot 1: Combined + video
        if (combinedPages.length > 0) allPages.push(...combinedPages);
        else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
        allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
        if (v1) allPages.push({ isVideo: true, duration: v1.duration, videoUrl: v1.url });

        // Slot 2: Location-specific + video
        if (locationPages.length > 0) allPages.push(...locationPages);
        else allPages.push({ stepTitle: 'No schedules', duration: 10, department: null, doctors: [] });
        allPages.push({ isBanner: true, duration: 10, bannerType: 'general' });
        if (v2) allPages.push({ isVideo: true, duration: v2.duration, videoUrl: v2.url });
      }
    }

    return { pages: allPages, playlist };
  },
};
