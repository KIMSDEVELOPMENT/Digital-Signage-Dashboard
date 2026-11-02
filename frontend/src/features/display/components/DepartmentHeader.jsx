import React from 'react';

/**
 * DepartmentHeader
 *
 * Renders the clean solid teal pill banner for each department section.
 * Accepts `theme` so accent colors are branch-configurable.
 *
 * @param {{ department?: string, theme?: any }} props
 */
const DepartmentHeader = ({ department, theme }) => {
  const accent = theme?.accentColor ?? '#005944';

  return (
    <div className="text-center mt-1 mb-3 xl:mb-3.5 w-auto max-w-fit mx-auto flex items-center justify-center gap-3 xl:gap-5 -translate-x-4 md:-translate-x-6 xl:-translate-x-8 2xl:-translate-x-10">
      {/* Left decorative line ending with solid dot */}
      <div className="w-20 sm:w-28 md:w-36 xl:w-48 2xl:w-56 shrink-0 flex items-center">
        <div
          className="w-3 h-3 xl:w-3.5 xl:h-3.5 rounded-full shrink-0 mr-2 shadow-sm"
          style={{ backgroundColor: accent }}
        />
        <div
          className="w-full h-[2.5px] xl:h-[3px] rounded-full shadow-xs"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Center Department Glass Pill */}
      <div
        className="px-10 md:px-12 xl:px-14 py-2 xl:py-2.5 rounded-xl xl:rounded-2xl shadow-[0_8px_24px_rgba(0,89,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/30 backdrop-blur-md inline-flex items-center justify-center transition-all shrink-0"
        style={{ backgroundColor: `${accent}e0` }}
      >
        <h3 className="text-xl md:text-2xl xl:text-3xl font-extrabold tracking-wide text-white drop-shadow-sm whitespace-nowrap">
          Department of {department}
        </h3>
      </div>

      {/* Right decorative line ending with solid dot */}
      <div className="w-20 sm:w-28 md:w-36 xl:w-48 2xl:w-56 shrink-0 flex items-center">
        <div
          className="w-full h-[2.5px] xl:h-[3px] rounded-full shadow-xs"
          style={{ backgroundColor: accent }}
        />
        <div
          className="w-3 h-3 xl:w-3.5 xl:h-3.5 rounded-full shrink-0 ml-2 shadow-sm"
          style={{ backgroundColor: accent }}
        />
      </div>
    </div>
  );
};

export default DepartmentHeader;
