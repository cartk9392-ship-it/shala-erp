import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocuments, getDocument, COLLECTIONS } from '../../api/apiService';

const ViewHomework = () => {
  const { userData } = useAuth();
  const [homeworkList, setHomeworkList] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const studentId = userData?.studentId;
      const studentClass = userData?.class;
      if (!studentClass) return;

      try {
        const [allHomework, allStatuses] = await Promise.all([
          getDocuments(COLLECTIONS.HOMEWORK),
          getDocuments('homework_status')
        ]);

        const myClassHomework = allHomework.filter(h => h.class === studentClass);
        setHomeworkList(myClassHomework);
        
        // Build a map of { homeworkId: { studentId: status } }
        const statusData = {};
        allStatuses.forEach(doc => {
          statusData[doc.id] = doc.statuses || {};
        });
        setStatusMap(statusData);
      } catch (error) {
        console.error('Error loading homework:', error);
      }
    };
    loadData();
    const interval = setInterval(loadData, 8000); // Poll every 8 seconds
    return () => clearInterval(interval);
  }, [userData]);

  const getStatusBadge = (hwId) => {
    const studentId = userData?.studentId;
    const hwStatus = statusMap[hwId]?.[studentId] || 'Not Checked';

    switch (hwStatus) {
      case 'Completed':
        return (
          <span className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-full border border-green-200 shadow-sm">
            <CheckCircle className="w-4 h-4 mr-1.5" /> Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center px-4 py-1.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-full border border-amber-200 shadow-sm">
            <Clock className="w-4 h-4 mr-1.5" /> Pending
          </span>
        );
      case 'Not Submitted':
        return (
          <span className="inline-flex items-center px-4 py-1.5 bg-red-100 text-red-700 text-sm font-bold rounded-full border border-red-200 shadow-sm">
            <XCircle className="w-4 h-4 mr-1.5" /> Not Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-4 py-1.5 bg-slate-100 text-slate-500 text-sm font-bold rounded-full border border-slate-200">
            <AlertCircle className="w-4 h-4 mr-1.5" /> Not Checked
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Child's Homework</h1>
        <p className="text-slate-500">View current and past homework assignments</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {homeworkList.map((hw) => (
          <div key={hw.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center hover:shadow-md transition duration-300">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mr-4 shrink-0 shadow-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md mb-2 inline-block uppercase tracking-wider">{hw.subject}</span>
                <h3 className="text-lg font-bold text-slate-800">{hw.title}</h3>
                <div className="flex items-center text-sm text-slate-500 mt-2 space-x-4">
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400" /> Due: {hw.dueDate}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              {getStatusBadge(hw.id)}
            </div>
          </div>
        ))}
        {homeworkList.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-100" />
            <p className="text-slate-400 font-medium">No homework assigned yet for your child's class.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewHomework;
