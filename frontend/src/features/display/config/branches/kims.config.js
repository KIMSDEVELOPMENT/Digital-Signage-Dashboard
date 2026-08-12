import kimsLogo from '../../../../common/assets/kims-logo.png';
import kiitLogo from '../../../../common/assets/kiit-logo.png';
import api from '../../../../common/services/api';

const formatSlug = (val) => {
  if (!val) return '';
  return val.toLowerCase().replace(/[\s/]+/g, '-').replace(/-+/g, '-');
};

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
              locLabel,
            });
          }
        });
      }
    });
  }
  return pages;
};

export const kimsConfig = {
  id: 'kims',
  displayName: 'KIMS Hospital',

  theme: {
    accentColor: '#fbbd61',
    bgPrimary: '#004d40',
    textPrimary: '#ffffff',
    logo: kimsLogo,
    footerNumbers: [
      { label: 'AMBULANCE', number: '0674-7111333 / 7440 070010' },
      { label: 'HELLO KIMS', number: '0674 2304400 / 7111000' },
      { label: '24X7 EMERGENCY', number: '0674 2725228 / 7105354' },
    ],
  },

  /**
   * Standard single-location playlist builder (used by PBMH and other simple branches).
   */
  async buildPages(branch, location) {
    const res = await api.get(`/display/${formatSlug(branch)}/${formatSlug(location)}`);
    const fetchedPlaylist = res.data;

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

    return { pages: allPages, playlist: fetchedPlaylist };
  },
};
