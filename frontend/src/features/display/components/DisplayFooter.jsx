import React from 'react';
import { Ambulance, PhoneCall } from 'lucide-react';

const ICON_MAP = {
  AMBULANCE: Ambulance,
  default: PhoneCall,
};

const FooterItem = ({ label, number }) => {
  const Icon = ICON_MAP[label] ?? ICON_MAP.default;
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-7 h-7 xl:w-8 xl:h-8 text-white" />
      <span className="text-white font-bold">{label}: {number}</span>
    </div>
  );
};

const renderFooterItems = (footerNumbers) => (
  <>
    {(footerNumbers || []).map((item, idx) => (
      <React.Fragment key={idx}>
        <FooterItem label={item.label} number={item.number} />
        <span className="text-white/70 font-light mx-8">|</span>
      </React.Fragment>
    ))}
  </>
);

/**
 * DisplayFooter
 *
 * Scrolling marquee footer with emergency contact numbers.
 * Numbers are driven by `theme.footerNumbers` from the branch config.
 * Styled with solid green/teal background and white typography.
 *
 * @param {{ theme?: any }} props
 */
const DisplayFooter = ({ theme }) => {
  const footerBg = theme?.footerBg ?? theme?.accentColor ?? '#017754';
  const footerNumbers = theme?.footerNumbers || [];

  return (
    <footer
      className="py-4 xl:py-5 shrink-0 shadow-lg z-10 overflow-hidden flex items-center border-t border-black/10"
      style={{ backgroundColor: footerBg }}
    >
      <div className="flex items-center w-max animate-marquee text-xl xl:text-2xl font-bold tracking-wide whitespace-nowrap select-none">
        {renderFooterItems(footerNumbers)}
        {renderFooterItems(footerNumbers)}
        {renderFooterItems(footerNumbers)}
        {renderFooterItems(footerNumbers)}
        {renderFooterItems(footerNumbers)}
      </div>
    </footer>
  );
};

export default DisplayFooter;
