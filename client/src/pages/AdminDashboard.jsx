import React, { useState, useEffect } from 'react';
import { Users, BookOpen, IndianRupee, UserPlus, Bell, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getDocuments, 
  getDocumentsWhere, 
  getDocument, 
  subscribeToCollection, 
  subscribeToCollectionWhere,
  COLLECTIONS 
} from '../api/apiService';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="premium-card group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150" style={{ color }}></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-green-500/10 text-green-600 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    revenue: 0,
    attendance: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Real-time subscriptions
    const unsubTeachers = subscribeToCollectionWhere(COLLECTIONS.USERS, 'role', '==', 'teacher', (data) => {
      setStats(prev => ({ ...prev, teachers: data.length }));
    });

    const unsubStudents = subscribeToCollection(COLLECTIONS.STUDENTS, (data) => {
      setStats(prev => ({ ...prev, students: data.length }));
    });

    const unsubFees = subscribeToCollection(COLLECTIONS.FEES, (data) => {
      const total = data.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      setStats(prev => ({ ...prev, revenue: total }));
    });

    const unsubAttendance = subscribeToCollection(COLLECTIONS.ATTENDANCE, (data) => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = data.filter(r => r.date === today);
      
      let totalStuds = 0;
      let presentCount = 0;

      todayRecords.forEach(record => {
        if (record.records) {
          record.records.forEach(r => {
            totalStuds++;
            if (r.status === 'Present') presentCount++;
          });
        }
      });

      const pct = totalStuds > 0 ? Math.round((presentCount / totalStuds) * 100) : 0;
      setStats(prev => ({ ...prev, attendance: pct }));
    });

    const unsubNotices = subscribeToCollection(COLLECTIONS.NOTICES, (data) => {
      const activities = data.slice(0, 3).map(n => ({
        id: n.id,
        text: `New Notice: ${n.title}`,
        time: n.date || 'Recent',
        icon: Bell,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
      }));
      setRecentActivity(activities);
    });

    return () => {
      unsubTeachers();
      unsubStudents();
      unsubFees();
      unsubAttendance();
      unsubNotices();
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Real-time school performance and metrics</p>
        </div>
        <button 
          onClick={() => navigate('/admin/teachers')}
          className="premium-button flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Manage Staff</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Students" value={stats.students} icon={Users} color="#3b82f6" trend="+12%" />
        <StatCard title="Total Teachers" value={stats.teachers} icon={BookOpen} color="#10b981" trend="+2" />
        <StatCard title="Total Revenue" value={`₹${stats.revenue.toLocaleString('en-IN')}`} icon={IndianRupee} color="#f59e0b" trend="Live" />
        <StatCard title="Attendance Today" value={`${stats.attendance}%`} icon={ClipboardList} color="#8b5cf6" trend="Live" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 premium-card">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Recent Insights</h2>
            <button className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="space-y-4 md:space-y-6">
            {recentActivity.map((act) => (
              <div key={act.id} className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl hover:bg-slate-50 transition-all duration-300">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${act.bg} ${act.color}`}>
                  <act.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-slate-900 leading-tight mb-1 truncate">{act.text}</p>
                  <p className="text-[10px] md:text-xs font-medium text-slate-400">{act.time}</p>
                </div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-200 group-hover:bg-primary transition-colors"></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="premium-card">
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Quick Links</h2>
            <div className="space-y-3">
              {[
                { label: 'Fee Records', icon: IndianRupee, path: '/admin/fees' },
                { label: 'Push Notice', icon: Bell, path: '/admin/notices' },
                { label: 'Staff Attendance', icon: ClipboardList, path: '/admin/staff-attendance' },
              ].map((item) => (
                <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
