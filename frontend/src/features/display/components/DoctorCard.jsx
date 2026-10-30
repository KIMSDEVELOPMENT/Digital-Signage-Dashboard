import React from 'react';
import { Clock } from 'lucide-react';

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
      className="relative flex items-center bg-white rounded-2xl xl:rounded-3xl border-2 shadow-md overflow-hidden w-full transition-all"
      style={{ borderColor: accent }}
    >
      {/* Left solid accent color bar */}
      <div
        className="w-5 md:w-6 xl:w-7 2xl:w-8 self-stretch flex-shrink-0"
        style={{ backgroundColor: accent }}
      />

      {/* Card Content: 3 horizontal columns (Left: Doctor Info, Center: Time Range, Right: Days Badges) */}
      <div className="flex items-center justify-between flex-1 min-w-0 px-5 xl:px-7 py-2 xl:py-2.5 gap-4 xl:gap-8">
        {/* Left Column: Photo + Name + Designation */}
        <div className="flex items-center gap-6 xl:gap-8 min-w-0">
          {/* Doctor Photo avatar frame (enlarged for prominent visibility) */}
          <div
            className="w-32 h-32 md:w-36 md:h-36 xl:w-40 xl:h-40 2xl:w-44 2xl:h-44 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0 border-4 xl:border-[4.5px]"
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
              className="w-full h-full items-center justify-center bg-teal-50"
              style={{ display: doc.photo_url ? 'none' : 'flex' }}
            >
              <span className="font-bold text-5xl xl:text-6xl 2xl:text-7xl" style={{ color: accent }}>
                {doc.name ? doc.name.charAt(0) : 'D'}
              </span>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="flex flex-col min-w-0 justify-center">
            <h3
              className="text-3xl xl:text-4xl font-extrabold tracking-normal truncate leading-tight"
              style={{ color: bgPrimary, fontFamily: '"Times New Roman", Times, serif' }}
            >
              {formattedName}
            </h3>
            <div className="inline-flex items-center px-3.5 py-0.5 rounded-full border border-teal-300 bg-teal-50/90 shadow-xs mt-1.5 w-fit">
              <span
                className="text-sm xl:text-base font-bold uppercase tracking-wider"
                style={{ color: accent, fontFamily: '"Times New Roman", Times, serif' }}
              >
                {doc.designation}
              </span>
            </div>
          </div>
        </div>

        {/* Center Column: Timing with Clock Icon */}
        <div className="flex items-center gap-3 xl:gap-3.5 px-3 xl:px-6 shrink-0">
          <Clock className="w-6 h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 shrink-0" style={{ color: accent }} />
          <span
            className="text-lg xl:text-2xl 2xl:text-3xl font-extrabold tracking-wide whitespace-nowrap"
            style={{ color: bgPrimary }}
          >
            {doc.timing || '09:00 AM - 05:00 PM'}
          </span>
        </div>

        {/* Right Column: Days Badges */}
        <div className="flex items-center justify-end gap-2 xl:gap-2.5 shrink-0">
          {DAYS.map((dayItem) => {
            const isActive = branchDays.some(
              (d) => String(d).trim().toUpperCase() === dayItem.key || String(d).trim().toLowerCase() === dayItem.label.toLowerCase()
            );

            return (
              <span
                key={dayItem.key}
                className={`w-14 xl:w-16 2xl:w-[70px] py-1.5 xl:py-2 text-center rounded-lg xl:rounded-xl text-sm xl:text-base 2xl:text-lg font-bold tracking-wide transition-all shadow-sm ${
                  isActive
                    ? 'text-white shadow'
                    : 'bg-white text-slate-400 border xl:border-2 border-slate-300 font-semibold'
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
