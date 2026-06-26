import React, { useState, useEffect } from 'react';
import { Users, ClipboardList, BookOpen, Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { getDocuments, getDocumentsWhere, addDocument, updateDocument, COLLECTIONS } from '../api/apiService';

const TeacherDashboard = () => {
  const { userData } = useAuth();
  const { showToast } = useDialog();
  const [stats, setStats] = useState({
    myStudents: 0,
    attendanceToday: 0,
    homeworkPending: 0
  });
  const [notices, setNotices] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const today = new Date().toLocaleDateString('en-CA');
        const teacherId = String(userData?.id || userData?._id || userData?.uid || '').trim();
        const myClass = userData?.classAssigned?.trim();

        // 1. Fetch Staff Attendance (independent of class)
        const myAttendance = await getDocuments(COLLECTIONS.STAFF_ATTENDANCE);
        const myTodayRecord = myAttendance.filter(r => {
          const rTeacherId = String(r.teacherId || '').trim();
          const rId = String(r.id || r._id || '').split('_')[0].trim();
          return (rTeacherId === teacherId || rId === teacherId) && r.date === today;
        });
        setAllAttendance(myTodayRecord);

        // 2. Fetch Class Data (dependent on class)
        if (myClass) {
          const [storedStudents, storedHomework, storedNotices, allStudentAttendance] = await Promise.all([
            getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass),
            getDocumentsWhere(COLLECTIONS.HOMEWORK, 'class', '==', myClass),
            getDocuments(COLLECTIONS.NOTICES),
            getDocumentsWhere(COLLECTIONS.ATTENDANCE, 'class', '==', myClass)
          ]);

          const todayRecord = allStudentAttendance.find(r => r.date === today);
          let attendancePct = 0;
          if (todayRecord && todayRecord.records) {
            const present = todayRecord.records.filter(r => r.status === 'Present').length;
            attendancePct = Math.round((present / todayRecord.records.length) * 100);
          }

          setStats({
            myStudents: storedStudents.length,
            attendanceToday: attendancePct,
            homeworkPending: storedHomework.length
          });
          setNotices(storedNotices.filter(n => n.target === 'All' || n.target === 'Teachers'));
        } else {
          // If no class assigned, still show notices
          const storedNotices = await getDocuments(COLLECTIONS.NOTICES);
          setNotices(storedNotices.filter(n => n.target === 'All' || n.target === 'Teachers'));
          setStats({ myStudents: 0, attendanceToday: 0, homeworkPending: 0 });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        if (isInitial) setLoading(false);
      }
    };
    
    loadData(true);
    const interval = setInterval(() => loadData(false), 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, [userData?.classAssigned, userData?._id]);

  const handleMarkAttendance = async () => {
    if (!userData) return;
    const today = new Date().toLocaleDateString('en-CA');
    const teacherId = String(userData?.id || userData?._id || userData?.uid || '').trim();
    const docId = `${teacherId}_${today}`;
    
    try {
      // Check if already marked by trying to get this specific document or filtering
      const allStaffAttendance = await getDocuments(COLLECTIONS.STAFF_ATTENDANCE);
      const existing = allStaffAttendance.filter(r => {
        const recordTeacherId = String(r.teacherId || '').trim();
        const recordDocId = String(r.id || r._id || '').split('_')[0].trim();
        return (recordTeacherId === teacherId || recordDocId === teacherId) && r.date === today;
      });
      
      if (existing.length > 0) {
        showToast('Attendance already marked for today!', 'warning');
        setAllAttendance(existing);
        return;
      }

      const savedDoc = await updateDocument(COLLECTIONS.STAFF_ATTENDANCE, docId, {
        teacherId: teacherId,
        teacherName: userData.name,
        date: today,
        status: 'Present'
      });
      setAllAttendance(prev => {
        const filtered = prev.filter(r => r.id !== docId);
        return [...filtered, savedDoc];
      });
      showToast('Attendance marked successfully!', 'success');
      setStats(prev => ({ ...prev, attendanceToday: 100 }));
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const isAttendanceMarked = () => {
    return allAttendance.length > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teacher Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's an overview of your class.</p>
        </div>
        {loading ? (
          <div className="bg-slate-100 animate-pulse h-10 w-40 rounded-xl"></div>
        ) : !isAttendanceMarked() ? (
          <button 
            onClick={handleMarkAttendance}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Mark My Attendance
          </button>
        ) : (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg border border-emerald-100 flex items-center font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Attendance Marked
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 rounded-xl text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">My Students</p>
            <p className="text-2xl font-bold text-slate-800">{stats.myStudents}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-emerald-100 rounded-xl text-emerald-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Attendance Today</p>
            <p className="text-2xl font-bold text-slate-800">{stats.attendanceToday}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-4 bg-amber-100 rounded-xl text-amber-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Homework</p>
            <p className="text-2xl font-bold text-slate-800">{stats.homeworkPending}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Latest School Notices</h2>
        <div className="space-y-4">
          {notices.map(notice => (
            <div key={notice.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-primary" />
                  {notice.title}
                </h3>
                <span className="text-xs text-slate-500">{notice.date}</span>
              </div>
              <p className="text-sm text-slate-600">{notice.content}</p>
            </div>
          ))}
          {notices.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8 italic">No new notices from administration.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
