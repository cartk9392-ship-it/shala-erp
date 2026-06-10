import React from 'react';
import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TopNavbar = ({ toggleSidebar }) => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-white/20 h-16 md:h-20 flex items-center justify-between px-4 md:px-6 lg:px-10 z-30 sticky top-0">
      <div className="flex items-center gap-3 md:gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-95"
        >
          <Menu className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
            Welcome back, <span className="text-primary">{userData?.name || 'User'}</span>
          </h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium">Have a productive day!</p>
        </div>
        {/* Mobile-only brand shorthand if needed, or just leave space */}
      </div>

      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-4 border-l border-slate-200">
          <div className="hidden md:block text-right">
            <p className="font-bold text-slate-900 text-sm leading-none">{userData?.name}</p>
            <p className="text-[10px] font-bold text-primary mt-1.5 uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-full inline-block">
              {userData?.role}
            </p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-lg shadow-primary/20 ring-2 ring-white">
            <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 group active:scale-95"
          title="Logout"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
