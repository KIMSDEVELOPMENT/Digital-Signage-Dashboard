import React from 'react';
import { Clock } from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const getFullPhotoUrl = (url) => {
  if (!url) return '';
  return `http://${window.location.hostname}:5000${url}`;
};

/**
 * DoctorCard
 *
 * Renders a single doctor row inside a department page.
 * Accepts `theme` so accent/border colors are branch-configurable.
 * The display_days parsing logic is preserved exactly from the original DisplayScreen.jsx.
 *
 * @param {{ doc: object, branch: string, location: string, theme: object }} props
 */
const DoctorCard = ({ doc, branch, location, theme }) => {
  const accent = theme?.accentColor ?? '#fbbd61';
  const bgPrimary = theme?.bgPrimary ?? '#004d40';

  // Resolve which days are active for this doctor (branch/location-aware)
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

  const formattedName = doc.name
    .replace(/^Dr\.?\s*/i, 'Dr. ')
    .replace(/(Dr\.\s*)(.*)/i, (_, prefix, name) => prefix + name.toUpperCase());

  return (
    <div className="flex items-center bg-gradient-to-b from-white/20 to-transparent backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl border border-white/20 px-8 py-5 w-full">
      {/* Left: Photo + Name */}
      <div className="flex items-center gap-8 w-[45%]">
        <div
          className="w-36 h-36 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0 border-[4px]"
          style={{ borderColor: accent }}
        >
          {doc.photo_url ? (
            <img
              src={getFullPhotoUrl(doc.photo_url)}
              alt={doc.name}
              className="w-full h-full object-contain p-1 bg-white rounded-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${bgPrimary}1a` }}>
              <span className="font-bold text-6xl" style={{ color: bgPrimary }}>
                {doc.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col drop-shadow-md">
          <h3
            className="text-3xl font-bold text-white tracking-wide leading-tight"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {formattedName}
          </h3>
          <p className="text-xl font-bold uppercase tracking-widest mt-1 leading-snug" style={{ color: accent }}>
            {doc.designation}
          </p>
        </div>
      </div>

      {/* Center: Timing */}
      <div
        className="flex items-center justify-start gap-3 px-6 py-2 rounded-lg bg-transparent font-bold text-4xl w-[25%] -ml-12 drop-shadow-md"
        style={{ color: accent, fontFamily: '"Times New Roman", Times, serif' }}
      >
        <Clock className="w-9 h-9 opacity-90" />
        {doc.timing}
      </div>

      {/* Right: Days */}
      <div className="flex justify-end gap-2 w-[30%]">
        <div className="flex flex-wrap justify-end gap-1.5">
          {DAYS.map(day => {
            const isActive = branchDays.includes(day);
            return (
              <span
                key={day}
                className={`px-2.5 py-1.5 rounded-lg text-base border-2 uppercase tracking-wide transition-all duration-300 shadow-sm ${
                  isActive ? 'font-extrabold' : 'bg-transparent text-white/40 font-semibold'
                }`}
                style={isActive ? {
                  backgroundColor: accent,
                  color: bgPrimary,
                  borderColor: accent,
                } : {
                  borderColor: `${accent}66`,
                }}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
