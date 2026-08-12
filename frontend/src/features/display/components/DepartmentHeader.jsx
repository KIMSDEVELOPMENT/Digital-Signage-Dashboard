import React from 'react';

/**
 * DepartmentHeader
 *
 * Renders the golden pill + decorative lines banner for each department section.
 * Accepts `theme` so accent colors are branch-configurable.
 *
 * @param {{ department: string, theme: { accentColor: string, bgPrimary: string } }} props
 */
const DepartmentHeader = ({ department, theme }) => {
  const accent = theme?.accentColor ?? '#fbbd61';
  const textColor = theme?.bgPrimary ?? '#004d40';

  return (
    <div className="text-center mb-8 w-full max-w-[85%] mx-auto flex items-center justify-center gap-4">
      {/* Left line */}
      <div className="flex-1 flex items-center">
        <div className="w-3 h-3 rounded-full shrink-0 mr-2" style={{ backgroundColor: accent }} />
        <div className="w-full h-[3px]" style={{ backgroundColor: accent }} />
      </div>

      {/* Center pill */}
      <div className="px-8 py-1.5 rounded-full shadow-md shrink-0" style={{ backgroundColor: accent }}>
        <h3
          className="text-[1.8rem] font-bold tracking-wide"
          style={{ color: textColor, fontFamily: '"Times New Roman", Times, serif' }}
        >
          Department of {department}
        </h3>
      </div>

      {/* Right line */}
      <div className="flex-1 flex items-center">
        <div className="w-full h-[3px]" style={{ backgroundColor: accent }} />
        <div className="w-3 h-3 rounded-full shrink-0 ml-2" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
};

export default DepartmentHeader;
