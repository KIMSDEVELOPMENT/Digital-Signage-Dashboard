import kidsLogo from '../../../../common/assets/kids-logo.png';
import { kimsConfig } from './kims.config.js';

/**
 * KIDS / Dental branch config.
 * Shares the same playlist-building logic as KIMS (single location, simple),
 * but overrides the logo. Extend this config if KIDS/Dental needs a
 * different playlist sequence in the future.
 */
export const kidsConfig = {
  ...kimsConfig,
  id: 'kids',
  displayName: 'KIMS Dental & Kids',

  theme: {
    ...kimsConfig.theme,
    logo: kidsLogo,
  },
};
