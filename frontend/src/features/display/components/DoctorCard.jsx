import React from 'react';

/**
 * ClinicWallClock — Option 2: Clinic wall clock with 12-hour tick marks and hands set to 9:00.
 */
const ClinicWallClock = ({ className, style }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Outer Rim */}
    <circle cx="12" cy="12" r="9.5" strokeWidth="2.2" />

    {/* Cardinal Hour Ticks (12, 3, 6, 9) */}
    <line x1="12" y1="2.5" x2="12" y2="5" strokeWidth="2.2" />
    <line x1="21.5" y1="12" x2="19" y2="12" strokeWidth="2.2" />
    <line x1="12" y1="21.5" x2="12" y2="19" strokeWidth="2.2" />
    <line x1="2.5" y1="12" x2="5" y2="12" strokeWidth="2.2" />

    {/* Intermediate Hour Ticks */}
    <line x1="16.75" y1="3.77" x2="15.8" y2="5.4" strokeWidth="1.5" />
    <line x1="20.23" y1="7.25" x2="18.6" y2="8.2" strokeWidth="1.5" />
    <line x1="20.23" y1="16.75" x2="18.6" y2="15.8" strokeWidth="1.5" />
    <line x1="16.75" y1="20.23" x2="15.8" y2="18.6" strokeWidth="1.5" />
    <line x1="7.25" y1="20.23" x2="8.2" y2="18.6" strokeWidth="1.5" />
    <line x1="3.77" y1="16.75" x2="5.4" y2="15.8" strokeWidth="1.5" />
    <line x1="3.77" y1="7.25" x2="5.4" y2="8.2" strokeWidth="1.5" />
    <line x1="7.25" y1="3.77" x2="8.2" y2="5.4" strokeWidth="1.5" />

    {/* Clock Hands at 9:00 */}
    <line x1="12" y1="12" x2="12" y2="6.5" strokeWidth="2.4" />
    <line x1="12" y1="12" x2="7.2" y2="12" strokeWidth="2.6" />

    {/* Center Hub Pin */}
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

const DAYS = [
  { label: 'Mon', key: 'MON' },
  { label: 'Tue', key: 'TUE' },
  { label: 'Wed', key: 'WED' },
  { label: 'Thu', key: 'THU' },
  { label: 'Fri', key: 'FRI' },
  { label: 'Sat', key: 'SAT' },
  { label: 'Sun', key: 'SUN' },
];

const getFullPhotoUrl = (url) => {
  if (!url) return '';
  const baseMediaUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : window.location.origin;
  return `${baseMediaUrl}${url}`;
};

/**
 * DoctorCard
 *
 * Renders a single doctor row inside a department page.
 * Keeps existing grid height and width, updated to the light teal/white card design.
 *
 * @param {{ doc: any, branch?: string, location?: string, theme?: any }} props
 */
const DoctorCard = ({ doc, branch, location, theme }) => {
  const accent = theme?.accentColor ?? '#005944';
  const bgPrimary = theme?.bgPrimary ?? '#004d40';

  // Resolve which days are active for this doctor (branch/location-aware logic preserved 100%)
  let parsedDays = doc.display_days
    ? (typeof doc.display_days === 'string' ? JSON.parse(doc.display_days) : doc.display_days)
    : [];

  let branchDays = [];
  if (Array.isArray(parsedDays)) {
    branchDays = parsedDays;
  } else if (parsedDays && typeof parsedDays === 'object') {
    const currentBranch = branch ? branch.toUpperCase() : 'SSCC';
    const currentLoc = location || '';
    const locKeyMatch = Object.keys(parsedDays).find(k => k.toLowerCase() === currentLoc.toLowerCase());
    branchDays = locKeyMatch ? parsedDays[locKeyMatch] : (parsedDays[currentBranch] || []);
  }

  // Format doctor name cleanly
  const formattedName = (doc.name || '')
    .trim()
    .replace(/^Dr\.?\s*/i, 'Dr. ');

  return (
    <div
      className="relative flex items-center bg-gradient-to-r from-white/55 via-white/40 to-white/35 backdrop-blur-lg rounded-2xl xl:rounded-3xl border-2 border-white/80 shadow-[0_8px_32px_0_rgba(0,89,68,0.14),inset_0_1px_2px_rgba(255,255,255,0.95)] overflow-hidden w-full transition-all"
    >
      {/* Left solid accent color bar */}
      <div
        className="w-3 md:w-3.5 xl:w-4 2xl:w-5 self-stretch flex-shrink-0 opacity-80 backdrop-blur-md"
        style={{ backgroundColor: accent }}
      />

      {/* Card Content: 3 distinct columns (Left: Avatar + Name & Designation Stack, Center: Consultation Timing, Right: Days Badges) */}
      <div className="flex items-center justify-between flex-1 min-w-0 px-4 md:px-5 xl:px-6 2xl:px-8 py-2 xl:py-2.5 gap-2 md:gap-4 xl:gap-6">
        {/* Left Column: Photo + (Name & Designation Stack) */}
        <div className="flex items-center gap-3 md:gap-4 xl:gap-5 shrink-0 min-w-0">
          {/* Doctor Photo avatar frame */}
          <div
            className="w-22 h-22 md:w-26 md:h-26 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 rounded-full overflow-hidden bg-white/50 backdrop-blur-md shadow-md flex-shrink-0 border-3 xl:border-4"
            style={{ borderColor: accent }}
          >
            {doc.photo_url ? (
              <img
                src={getFullPhotoUrl(doc.photo_url)}
                alt=""
                className="w-full h-full object-cover bg-white rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className="w-full h-full items-center justify-center bg-teal-50/50 backdrop-blur-sm"
              style={{ display: doc.photo_url ? 'none' : 'flex' }}
            >
              <span className="font-bold text-4xl xl:text-5xl 2xl:text-6xl" style={{ color: accent }}>
                {doc.name ? doc.name.charAt(0) : 'D'}
              </span>
            </div>
          </div>

          {/* Doctor Name & Designation Stack */}
          <div className="flex flex-col justify-center min-w-0">
            <h3
              className="text-xl md:text-2xl xl:text-3xl 2xl:text-[2rem] font-extrabold tracking-normal whitespace-nowrap leading-tight"
              style={{ color: bgPrimary, fontFamily: '"Times New Roman", Times, serif' }}
            >
              {formattedName}
            </h3>
            <div
              className="inline-flex items-center px-3.5 xl:px-4.5 py-1 xl:py-1.5 rounded-xl xl:rounded-2xl shadow-md border mt-1.5 xl:mt-2 w-fit transition-all"
              style={{ backgroundColor: accent, borderColor: accent }}
            >
              <span className="text-xs sm:text-sm xl:text-sm 2xl:text-base font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                {doc.designation}
              </span>
            </div>
          </div>
        </div>

        {/* Center Column: Consultation Timing with Clinic Wall Clock */}
        <div className="flex items-center justify-center gap-2 xl:gap-3 px-1 xl:px-3 shrink-0">
          <ClinicWallClock className="w-6 h-6 md:w-7 md:h-7 xl:w-8 xl:h-8 shrink-0" style={{ color: accent }} />
          <span
            className="text-lg md:text-xl xl:text-2xl 2xl:text-3xl font-extrabold tracking-wide whitespace-nowrap"
            style={{ color: bgPrimary }}
          >
            {doc.timing || '09:00 AM - 05:00 PM'}
          </span>
        </div>

        {/* Right Column: Days Badges */}
        <div className="flex items-center justify-end gap-1 md:gap-1.5 xl:gap-2 shrink-0">
          {DAYS.map((dayItem) => {
            const isActive = branchDays.some(
              (d) => String(d).trim().toUpperCase() === dayItem.key || String(d).trim().toLowerCase() === dayItem.label.toLowerCase()
            );

            return (
              <span
                key={dayItem.key}
                className={`w-12 md:w-14 xl:w-16 2xl:w-[70px] py-1.5 xl:py-2 text-center rounded-xl xl:rounded-2xl text-base md:text-lg xl:text-xl 2xl:text-2xl font-extrabold tracking-wide transition-all ${
                  isActive
                    ? 'text-white shadow-md border'
                    : 'bg-white/35 backdrop-blur-sm text-slate-700 border xl:border-2 border-white/75 shadow-xs font-semibold'
                }`}
                style={isActive ? { backgroundColor: accent, borderColor: accent } : {}}
              >
                {dayItem.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
