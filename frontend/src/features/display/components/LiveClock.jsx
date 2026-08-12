import React, { useState, useEffect } from 'react';

/**
 * LiveClock — displays current date and time in the display header.
 * Extracted from DisplayScreen.jsx (was an inline component).
 */
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="w-1/5 text-right flex flex-col items-end text-white justify-center">
      <p
        className="text-3xl font-medium whitespace-nowrap drop-shadow-md"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {dateString}
      </p>
      <p
        className="text-7xl font-bold mt-1 tracking-tight drop-shadow-md"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {timeString}
      </p>
    </div>
  );
};

export default LiveClock;
