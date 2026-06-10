import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, XCircle, User, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocuments, subscribeToCollection, COLLECTIONS } from '../../api/apiService';

const ViewAttendance = () => {
  const { userData } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    const studentId = userData?.studentId;
    if (!studentId) return;

    // 1. Load Student Info Once
    const loadStudentInfo = async () => {
      try {
        const myChild = await getDocument(COLLECTIONS.STUDENTS, studentId.toString());
        setStudentInfo(myChild);
      } catch (e) { console.error(e); }
    };
    loadStudentInfo();

    // 2. Subscribe to Attendance Records (Real-time)
    const unsubscribe = subscribeToCollection(COLLECTIONS.ATTENDANCE, (allAttendance) => {
      try {
        const dateStatusMap = {};
        
        // Sort by timestamp to ensure the latest update for each day is processed last
        const sortedAttendance = [...allAttendance].sort((a, b) => {
          const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
          return timeA - timeB;
        });

        sortedAttendance.forEach(dayRecord => {
          if (!dayRecord.records || !Array.isArray(dayRecord.records)) return;
          
          const record = dayRecord.records.find(r => 
            r && r.studentId && String(r.studentId) === String(studentId)
          );
          
          if (record && dayRecord.date) {
            dateStatusMap[dayRecord.date] = record.status;
          }
        });

        const studentRecords = Object.entries(dateStatusMap).map(([date, status]) => ({
          date,
          status
        }));

        studentRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceRecords(studentRecords);
      } catch (error) {
        console.error('Error processing real-time attendance:', error);
      }
    });

    return () => unsubscribe();
  }, [userData]);

  const stats = useMemo(() => {
    if (attendanceRecords.length === 0) return { present: 0, absent: 0, percentage: 0 };
    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const percentage = ((present / attendanceRecords.length) * 100).toFixed(1);
    return { present, absent, percentage };
  }, [attendanceRecords]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Report</h1>
          <p className="text-slate-500">
            Current Month: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} | 
            Student: <span className="font-bold text-slate-700">{studentInfo?.name || 'Loading...'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mb-2 ${Number(stats.percentage) > 75 ? 'border-green-500' : 'border-amber-500'}`}>
            <span className="text-2xl font-bold text-slate-800">{stats.percentage}%</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Overall Attendance</p>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl shadow-sm border-2 border-green-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-green-800 text-lg font-bold">Total Present</h3>
            <CheckCircle className="text-green-600 w-6 h-6" />
          </div>
          <p className="text-3xl font-black text-green-600">{stats.present} Days</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border-2 border-red-100 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-red-800 text-lg font-bold">Total Absent</h3>
            <XCircle className="text-red-600 w-6 h-6" />
          </div>
          <p className="text-3xl font-black text-red-600">{stats.absent} Days</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
          <Calendar className="w-5 h-5 text-slate-500 mr-2" />
          <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Recent Attendance Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100">
              {attendanceRecords.map((record, index) => (
                <tr key={index} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.status === 'Present' ? (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> PRESENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> ABSENT
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {attendanceRecords.length === 0 && (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500 italic">No attendance records found for your child.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewAttendance;
