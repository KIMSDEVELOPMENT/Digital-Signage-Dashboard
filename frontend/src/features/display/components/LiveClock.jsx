import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

/**
 * LiveClock — displays current date and 12-hour time in the display header.
 * - PBMH variant: Formatted with Calendar icon and bold sans text to sit inside the teal corner wave badge.
 * - SSCC / Classic variant: Formatted with clean Times New Roman right-aligned text and drop shadow.
 *
 * @param {{ variant?: string }} props
 */
const LiveClock = ({ variant = 'pbmh' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPbmh = variant === 'pbmh';

  const timeString = isPbmh
    ? time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isPbmh) {
    return (
      <div className="w-auto min-w-[260px] xl:min-w-[300px] 2xl:min-w-[340px] text-center flex flex-col items-center justify-center text-white self-center my-auto translate-x-4 xl:translate-x-6 pr-0 xl:pr-1 select-none shrink-0">
        <div className="flex items-center justify-center gap-2.5 text-white text-2xl xl:text-[1.7rem] 2xl:text-3xl font-bold tracking-wide drop-shadow-sm">
          <Calendar className="w-6.5 h-6.5 xl:w-7.5 xl:h-7.5 2xl:w-8.5 2xl:h-8.5 text-white shrink-0" />
          <span>{dateString}</span>
        </div>
        <p className="text-5xl xl:text-6xl 2xl:text-7xl font-extrabold tracking-tight text-white mt-0.5 drop-shadow-sm text-center">
          {timeString}
        </p>
      </div>
    );
  }

  // SSCC / Classic style: Right-aligned serif typography with drop-shadow
  return (
    <div className="w-1/5 text-right flex flex-col items-end text-white justify-center select-none shrink-0">
      <p
        className="text-2xl xl:text-3xl font-medium whitespace-nowrap drop-shadow-md"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {dateString}
      </p>
      <p
        className="text-5xl xl:text-7xl font-bold mt-1 tracking-tight drop-shadow-md whitespace-nowrap"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {timeString}
      </p>
    </div>
  );
};

export default LiveClock;
