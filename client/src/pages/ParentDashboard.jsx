import React, { useState, useEffect } from 'react';
import { User, Book, Calendar, IndianRupee, Bell, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDocuments, getDocument, COLLECTIONS } from '../api/apiService';

const ParentDashboard = () => {
  const { userData } = useAuth();
  const [childData, setChildData] = useState({
    name: 'Loading...',
    class: 'N/A',
    attendance: 0,
    homework: 0
  });
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!userData?.studentId) return;

      try {
        const studentId = userData.studentId;
        const [myChild, allHomework, allNotices, allAttendance] = await Promise.all([
          getDocument(COLLECTIONS.STUDENTS, studentId),
          getDocuments(COLLECTIONS.HOMEWORK),
          getDocuments(COLLECTIONS.NOTICES),
          getDocuments(COLLECTIONS.ATTENDANCE)
        ]);

        if (myChild) {
          // 1. Calculate Attendance %
          const myAttendanceRecords = [];
          allAttendance.forEach(dayRecord => {
            const record = dayRecord.records.find(r => r.studentId.toString() === studentId.toString());
            if (record) myAttendanceRecords.push(record.status);
          });

          const presentDays = myAttendanceRecords.filter(s => s === 'Present').length;
          const attPercentage = myAttendanceRecords.length > 0
            ? ((presentDays / myAttendanceRecords.length) * 100).toFixed(1)
            : 0;

          // 2. Calculate Pending Homework
          const myClassHomework = allHomework.filter(h => h.class === myChild.class);

          setChildData({
            name: myChild.name,
            class: myChild.class,
            attendance: attPercentage,
            homework: myClassHomework.length // Simplified
          });
        }

        setNotices(allNotices.filter(n => n.target === 'All' || n.target === 'Parents'));
      } catch (error) {
        console.error('Error loading parent dashboard data:', error);
      }
    };
    loadData();
    const interval = setInterval(loadData, 8000); // Real-time polling every 8s
    return () => clearInterval(interval);
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-r from-white to-blue-50">
        <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{childData.name}'s Dashboard</h1>
          <p className="text-slate-500 font-bold flex items-center">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs mr-2">{childData.class}</span>
            Academic Year 2026-27
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-500 transition-all duration-300">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Attendance</h3>
          <p className="text-3xl font-black text-slate-800">{childData.attendance}%</p>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${childData.attendance}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all duration-300">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <Book className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Homework</h3>
          <p className="text-3xl font-black text-slate-800">{childData.homework} <span className="text-sm text-slate-400 font-bold uppercase">Pending</span></p>
          <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Check details in Homework tab
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-amber-500 transition-all duration-300">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
            <IndianRupee className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Fees Status</h3>
          <p className="text-3xl font-black text-slate-800">Clear</p>
          <p className="text-xs text-amber-600 mt-2 font-bold flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" /> No Pending Dues
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-purple-500 transition-all duration-300">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Class</h3>
          <p className="text-3xl font-black text-slate-800">{childData.class}</p>
          <p className="text-xs text-purple-600 mt-2 font-bold uppercase">Main Section</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Latest School Notices</h2>
          <Bell className="w-5 h-5 text-primary animate-bounce" />
        </div>
        <div className="space-y-4">
          {notices.map(notice => (
            <div key={notice.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                  {notice.title}
                </h3>
                <span className="text-xs font-bold text-slate-400">{notice.date}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{notice.content}</p>
            </div>
          ))}
          {notices.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-slate-100 mx-auto mb-4" />
              <p className="text-sm text-slate-400 font-medium italic">No new notices for parents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
