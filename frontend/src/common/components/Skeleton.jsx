import React from 'react';

export const CardSkeleton = () => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800/40 animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-800/60 rounded-md w-2/3" />
          <div className="h-3 bg-slate-800/60 rounded-md w-1/2" />
        </div>
      </div>
      <div className="h-24 bg-slate-800/40 rounded-xl" />
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="glass-panel rounded-2xl border border-slate-800/40 overflow-hidden animate-pulse">
      <div className="h-14 bg-slate-900/60 border-b border-slate-800/40 px-6 flex items-center justify-between">
        <div className="h-5 bg-slate-800/60 rounded w-1/4" />
        <div className="h-8 bg-slate-800/40 rounded w-1/3" />
      </div>
      <div className="divide-y divide-slate-800/20 px-6">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="py-4 flex gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className="h-4 bg-slate-800/40 rounded" 
                style={{ width: `${100 / cols - 5}%` }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableRowSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse border-b border-slate-800/40 last:border-0">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-6 py-4">
              <div className="h-4 bg-slate-800/60 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-800/60 rounded w-1/2" />
            <div className="w-8 h-8 bg-slate-800/60 rounded-lg" />
          </div>
          <div className="h-8 bg-slate-800/80 rounded w-1/3" />
          <div className="h-3 bg-slate-800/40 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
};
