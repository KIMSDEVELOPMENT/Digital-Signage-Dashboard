import React from 'react';
import { Ambulance, PhoneCall } from 'lucide-react';

const ICON_MAP = {
  AMBULANCE: Ambulance,
  default: PhoneCall,
};

/**
 * DisplayFooter
 *
 * Scrolling marquee footer with emergency contact numbers.
 * Numbers are driven by `theme.footerNumbers` from the branch config — no hardcoded strings.
 *
 * @param {{ theme: { footerNumbers: Array<{ label: string, number: string }> } }} props
 */
const DisplayFooter = ({ theme }) => {
  const FooterItem = ({ label, number }) => {
    const Icon = ICON_MAP[label] ?? ICON_MAP.default;
    return (
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8 text-[#fbbd61]" fill="currentColor" />
        <span>{label}: {number}</span>
      </div>
    );
  };

  const FooterContent = () => (
    <>
      {theme.footerNumbers.map((item, idx) => (
        <React.Fragment key={idx}>
          <FooterItem label={item.label} number={item.number} />
          <span className="text-[#fbbd61]/70 font-light mx-8">|</span>
        </React.Fragment>
      ))}
    </>
  );

  return (
    <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 text-white py-5 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.2)] z-10 overflow-hidden flex items-center">
      <div className="flex items-center w-max animate-marquee text-2xl font-bold tracking-wide whitespace-nowrap">
        <FooterContent />
        <FooterContent />
        <FooterContent />
        <FooterContent />
        <FooterContent />
      </div>
    </footer>
  );
};

export default DisplayFooter;
