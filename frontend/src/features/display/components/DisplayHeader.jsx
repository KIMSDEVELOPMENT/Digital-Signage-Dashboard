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
  const hasEmblemAndName = Boolean(theme?.emblem && theme?.headerName);

  return (
    <header className="w-full flex items-center justify-between px-6 xl:px-10 py-1.5 z-10 shrink-0 min-h-[135px] xl:min-h-[160px] 2xl:min-h-[175px] relative">
      {/* Center: Hospital Branding Lockup — shifted clear of the green corner wave and centered with the department banner */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -ml-18 md:-ml-24 xl:-ml-32 2xl:-ml-38 pt-2.5 xl:pt-3.5 flex items-center justify-center gap-4 xl:gap-5.5 2xl:gap-6 pointer-events-none">
        {hasEmblemAndName ? (
          <>
            <img
              src={theme.emblem}
              alt="Hospital Emblem"
              className="h-[110px] xl:h-[132px] 2xl:h-[150px] w-auto object-contain drop-shadow-sm shrink-0"
            />
            <img
              src={theme.headerName}
              alt="Hospital Header Name"
              className="w-auto max-w-[950px] xl:max-w-[1250px] 2xl:max-w-[1450px] max-h-[130px] xl:max-h-[152px] 2xl:max-h-[168px] object-contain shrink-0 translate-y-2.5 md:translate-y-3 xl:translate-y-3.5 2xl:translate-y-4"
            />
          </>
        ) : (
          <img
            src={theme?.logo}
            alt="Branch Logo"
            className="w-auto max-w-[1050px] xl:max-w-[1300px] 2xl:max-w-[1500px] max-h-[130px] xl:max-h-[155px] 2xl:max-h-[170px] object-contain shrink-0"
          />
        )}
      </div>

      {/* Left spacer for flex symmetry */}
      <div className="w-6 xl:w-10 shrink-0 pointer-events-none" />

      {/* Right: Live clock */}
      <LiveClock />
    </header>
  );
};

export default DisplayHeader;
