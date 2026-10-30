import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

/**
 * LiveClock — displays current date and 12-hour time in the display header.
 * Formatted to match the top-right teal corner badge of the new design.
 */
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-[22%] text-right flex flex-col items-end text-white justify-center pr-6 pt-1 select-none">
      <div className="flex items-center gap-2 text-white/95 text-base xl:text-lg font-medium tracking-wide drop-shadow-sm">
        <Calendar className="w-5 h-5 text-white shrink-0" />
        <span>{dateString}</span>
      </div>
      <p className="text-4xl xl:text-5xl font-bold tracking-tight text-white mt-0.5 drop-shadow-sm">
        {timeString}
      </p>
    </div>
  );
};

export default LiveClock;
