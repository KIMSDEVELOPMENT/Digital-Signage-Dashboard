import React from 'react';
import LiveClock from './LiveClock';

/**
 * DisplayHeader
 *
 * Renders the top bar of the display screen with the natural full-color branch logo and live clock.
 * Accepts `theme` from the branch config.
 *
 * @param {{ theme?: any }} props
 */
const DisplayHeader = ({ theme }) => {
  return (
    <header className="flex items-center justify-between px-8 xl:px-12 py-2 z-10 shrink-0 min-h-[110px] xl:min-h-[130px] relative">
      {/* Left spacer for symmetry with top-right clock */}
      <div className="w-[8%] hidden xl:block" />

      {/* Center: Branch logo — natural colors for light theme */}
      <div className="flex-1 flex items-center justify-center px-4">
        <img
          src={theme.logo}
          alt="Branch Logo"
          className="w-full max-w-[850px] xl:max-w-[1000px] max-h-[115px] xl:max-h-[140px] object-contain"
        />
      </div>

      {/* Right: Live clock */}
      <LiveClock />
    </header>
  );
};

export default DisplayHeader;
