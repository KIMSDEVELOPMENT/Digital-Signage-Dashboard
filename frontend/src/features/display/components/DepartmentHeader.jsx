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
    <div className="text-center mt-1 mb-3 xl:mb-3.5 w-full flex items-center justify-center">
      <div
        className="px-10 md:px-12 xl:px-14 py-2 xl:py-2.5 rounded-xl xl:rounded-2xl shadow-md inline-flex items-center justify-center transition-all"
        style={{ backgroundColor: accent }}
      >
        <h3 className="text-xl md:text-2xl xl:text-3xl font-extrabold tracking-wide text-white drop-shadow-sm">
          Department of {department}
        </h3>
      </div>
    </div>
  );
};

export default DepartmentHeader;
