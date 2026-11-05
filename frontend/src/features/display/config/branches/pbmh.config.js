import kimsLogo from '../../../../common/assets/kims-logo.png';
import kssccEmblem from '../../../../common/assets/ksscc-emblem.png';
import kssccText from '../../../../common/assets/ksscc-text.png';
import bgPbmh from '../../../../common/assets/bg-pbmh.png';
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

export const pbmhConfig = {
  id: 'pbmh',
  displayName: 'Pradyumna Bal Memorial Hospital',

  theme: {
    variant: 'pbmh',
    bgImage: bgPbmh,
    accentColor: '#005944',
    bgPrimary: '#004d40',
    textPrimary: '#ffffff',
    footerBg: '#017754',
    footerIconColor: '#ffffff',
    logo: kimsLogo,
    emblem: kssccEmblem,
    headerName: kssccText,
    footerNumbers: [
      { label: 'AMBULANCE', number: '0674-7111333 / 7440 070010' },
      { label: 'HELLO KIMS', number: '0674 2304400 / 7111000' },
      { label: '24X7 EMERGENCY', number: '0674 2725228 / 7105354' },
    ],
  },

  /**
   * Single-location playlist builder for PBMH.
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
