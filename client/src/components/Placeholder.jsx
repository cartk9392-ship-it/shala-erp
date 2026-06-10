import React from 'react';
import { useLocation } from 'react-router-dom';

const Placeholder = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pageName = pathParts[pathParts.length - 1]?.replace('-', ' ') || 'Module';
  
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl text-primary capitalize">{pageName.charAt(0)}</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 capitalize mb-2">{pageName} Module</h2>
      <p className="text-slate-500 max-w-md">
        This section is currently under development. The sidebar navigation is working, but the specific functionality for this page is yet to be built!
      </p>
    </div>
  );
};

export default Placeholder;
