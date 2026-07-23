import React from 'react';

const BottomFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-4 mt-auto border-t border-slate-800/60 bg-slate-900/50 backdrop-blur-sm px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
        <p>
          &copy; {currentYear} KIMS ICT. All Rights Reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default BottomFooter;
