import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  CalendarCheck, 
  FileText, 
  BookOpen, 
  Bell, 
  Settings,
  Award,
  CalendarClock,
  GraduationCap,
  LineChart
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { userData, unreadNoticeCount } = useAuth();
  const role = userData?.role || 'parent'; // default fallback

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Manage Teachers', path: '/admin/teachers', icon: Users },
    { name: 'Manage Classes', path: '/admin/classes', icon: BookOpen },
    { name: 'All Students', path: '/admin/students', icon: UserCircle },
    { name: 'Notices', path: '/admin/notices', icon: Bell },
    { name: 'Staff Attendance', path: '/admin/staff-attendance', icon: CalendarCheck },
    { name: 'Finance & Fees', path: '/admin/fees', icon: FileText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const teacherLinks = [
    { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { name: 'My Students', path: '/teacher/students', icon: Users },
    { name: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck },
    { name: 'Homework', path: '/teacher/homework', icon: BookOpen },
    { name: 'Exam Marks', path: '/teacher/marks', icon: FileText },
    { name: 'Exam Schedule', path: '/teacher/exam-schedule', icon: CalendarClock },
    { name: 'Syllabus Tracker', path: '/teacher/syllabus', icon: GraduationCap },
    { name: 'Performance Graph', path: '/teacher/performance', icon: LineChart },
    { name: 'Report Cards', path: '/teacher/report-cards', icon: Award },
    { name: 'Parent Accounts', path: '/teacher/parents', icon: UserCircle },
    { name: 'Notices', path: '/teacher/notices', icon: Bell },
  ];

  const parentLinks = [
    { name: 'Dashboard', path: '/parent', icon: LayoutDashboard },
    { name: 'Child Profile', path: '/parent/profile', icon: UserCircle },
    { name: 'Attendance', path: '/parent/attendance', icon: CalendarCheck },
    { name: 'Homework', path: '/parent/homework', icon: BookOpen },
    { name: 'Fees Status', path: '/parent/fees', icon: FileText },
    { name: 'Results', path: '/parent/results', icon: FileText },
    { name: 'Exam Schedule', path: '/parent/exam-schedule', icon: CalendarClock },
    { name: 'Syllabus', path: '/parent/syllabus', icon: GraduationCap },
    { name: 'My Performance', path: '/parent/performance', icon: LineChart },
    { name: 'Notices', path: '/parent/notices', icon: Bell },
  ];

  const links = role === 'admin' ? adminLinks : role === 'teacher' ? teacherLinks : parentLinks;

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-premium-dark text-white transition-all duration-500 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-0 border-r border-white/5`}>
      <div className="flex items-center px-8 h-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Shala<span className="text-primary font-black">ERP</span>
          </h1>
        </div>
      </div>
      
      <div className="py-6 overflow-y-auto h-[calc(100vh-5rem)] custom-scrollbar">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 px-4 mb-2">Main Menu</p>
        </div>
        <ul className="space-y-1.5 px-4">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.name}>
                <NavLink
                  to={link.path}
                  end={link.path === '/admin' || link.path === '/teacher' || link.path === '/parent'}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      toggleSidebar();
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="text-[14px] font-medium tracking-wide">{link.name}</span>
                      {link.name === 'Notices' && role !== 'admin' && unreadNoticeCount > 0 && (
                        <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">
                          {unreadNoticeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
