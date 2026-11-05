import React from 'react';
import { Ambulance, PhoneCall } from 'lucide-react';

const ICON_MAP = {
  AMBULANCE: Ambulance,
  default: PhoneCall,
};

const FooterItem = ({ label, number, iconColor }) => {
  const Icon = ICON_MAP[label] ?? ICON_MAP.default;
  return (
    <div className="flex items-center gap-3">
      <Icon
        className="w-7 h-7 xl:w-8 xl:h-8"
        style={{ color: iconColor }}
      />
      <span className="text-white font-bold">{label}: {number}</span>
    </div>
  );
};

const renderFooterItems = (footerNumbers, iconColor, separatorClass) => (
  <>
    {(footerNumbers || []).map((item, idx) => (
      <React.Fragment key={idx}>
        <FooterItem label={item.label} number={item.number} iconColor={iconColor} />
        <span className={`${separatorClass} font-light mx-8`}>|</span>
      </React.Fragment>
    ))}
  </>
);

/**
 * DisplayFooter
 *
 * Scrolling marquee footer with emergency contact numbers.
 * - PBMH: Solid teal background with white typography & white icons.
 * - SSCC / Classic: Translucent dark background with white typography & gold icons.
 *
 * @param {{ theme?: any }} props
 */
const DisplayFooter = ({ theme }) => {
  const isPbmh = theme?.variant === 'pbmh';
  const footerBg = theme?.footerBg ?? (isPbmh ? '#017754' : 'rgba(0, 0, 0, 0.4)');
  const iconColor = isPbmh ? '#ffffff' : (theme?.footerIconColor || '#fbbd61');
  const separatorClass = isPbmh ? 'text-white/70' : 'text-[#fbbd61]/70';
  const footerNumbers = theme?.footerNumbers || [];

  return (
    <footer
      className={`py-4 xl:py-5 shrink-0 z-10 overflow-hidden flex items-center ${
        isPbmh
          ? 'shadow-lg border-t border-black/10'
          : 'bg-black/40 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_15px_rgba(0,0,0,0.2)]'
      }`}
      style={{ backgroundColor: footerBg }}
    >
      <div className="flex items-center w-max animate-marquee text-xl xl:text-2xl font-bold tracking-wide whitespace-nowrap select-none">
        {renderFooterItems(footerNumbers, iconColor, separatorClass)}
        {renderFooterItems(footerNumbers, iconColor, separatorClass)}
        {renderFooterItems(footerNumbers, iconColor, separatorClass)}
        {renderFooterItems(footerNumbers, iconColor, separatorClass)}
        {renderFooterItems(footerNumbers, iconColor, separatorClass)}
      </div>
    </footer>
  );
};

export default DisplayFooter;
