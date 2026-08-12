import React from 'react';
import LiveClock from './LiveClock';

/**
 * DisplayHeader
 *
 * Renders the top bar of the display screen with the branch logo and live clock.
 * Accepts `theme` from the branch config — no hardcoded logos or conditionals.
 *
 * @param {{ theme: { logo: string } }} props
 */
const DisplayHeader = ({ theme }) => {
  return (
    <header className="flex items-center justify-between px-10 py-2 z-10 shrink-0 min-h-[120px] relative">
      {/* Left spacer */}
      <div className="w-[10%]" />

      {/* Center: Branch logo — driven by theme config, no if/else */}
      <div className="flex-1 flex items-center justify-center px-4 drop-shadow-md">
        <img
          src={theme.logo}
          alt="Branch Logo"
          className="w-full max-w-[1200px] max-h-[180px] object-contain brightness-0 invert"
        />
      </div>

      {/* Right: Live clock */}
      <LiveClock />
    </header>
  );
};

export default DisplayHeader;
