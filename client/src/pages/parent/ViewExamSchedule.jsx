import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, BookOpen, CheckCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocumentsWhere, COLLECTIONS } from '../../api/apiService';

const statusStyle = {
  upcoming:  'bg-blue-100 text-blue-700',
  ongoing:   'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};
const statusLabel = {
  upcoming:  '🕐 Upcoming',
  ongoing:   '📝 Ongoing',
  completed: '✅ Completed',
};

const computeStatus = (subjects) => {
  if (!subjects || subjects.length === 0) return 'upcoming';
  const today = new Date().toISOString().split('T')[0];
  const dates = subjects.map(s => s.date).filter(Boolean).sort();
  if (!dates.length) return 'upcoming';
  if (today < dates[0]) return 'upcoming';
  if (today > dates[dates.length - 1]) return 'completed';
  return 'ongoing';
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ViewExamSchedule() {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [childClass, setChildClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    const studentId = userData?.studentId;
    if (!studentId) return;
    setLoading(true);
    try {
      const child = await getDocument(COLLECTIONS.STUDENTS, studentId.toString());
      const cls = child?.class;
      setChildClass(cls || '');
      if (!cls) return;

      const data = await getDocumentsWhere(COLLECTIONS.EXAM_SCHEDULES, 'class', '==', cls);
      data.sort((a, b) => {
        const aDate = a.subjects?.[0]?.date || '';
        const bDate = b.subjects?.[0]?.date || '';
        return bDate.localeCompare(aDate);
      });
      setSchedules(data);
      // Auto-expand first upcoming/ongoing
      const first = data.find(s => computeStatus(s.subjects) !== 'completed');
      if (first) setExpandedId(first.id);
    } catch (err) {
      console.error('Error loading exam schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [userData?.studentId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000); // Real-time polling every 8s
    return () => clearInterval(interval);
  }, [loadData]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exam Schedule</h1>
          <p className="text-slate-500">Class <strong>{childClass || '—'}</strong> — upcoming & past exams</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Refresh">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Countdown strip — next upcoming exam */}
      {(() => {
        const next = schedules
          .flatMap(s => (s.subjects || []).map(sub => ({ ...sub, examName: s.examName })))
          .filter(sub => sub.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        if (!next) return null;
        const daysLeft = Math.ceil((new Date(next.date) - new Date()) / 86400000);
        return (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Next Exam</p>
              <h2 className="text-xl font-bold mt-0.5">{next.examName} — {next.subject}</h2>
              <p className="text-blue-100 text-sm mt-1">{fmtDate(next.date)} · {next.time} · {next.duration}</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-5 py-3">
              <p className="text-3xl font-black">{daysLeft}</p>
              <p className="text-blue-200 text-xs font-semibold uppercase">{daysLeft === 1 ? 'Day Left' : 'Days Left'}</p>
            </div>
          </div>
        );
      })()}

      {/* Schedule list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <CalendarDays className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Exam Schedules Yet</h3>
          <p className="text-slate-400 mt-1">Your teacher hasn't published any exam schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map(schedule => {
            const isExpanded = expandedId === schedule.id;
            const status = computeStatus(schedule.subjects);
            const sorted = [...(schedule.subjects || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            const startDate = sorted[0]?.date;
            const endDate   = sorted[sorted.length - 1]?.date;

            return (
              <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800">{schedule.examName}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyle[status]}`}>
                          {statusLabel[status]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {sorted.length} subject{sorted.length !== 1 ? 's' : ''}
                        {startDate && ` · ${fmtDate(startDate)}${endDate !== startDate ? ` → ${fmtDate(endDate)}` : ''}`}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                {/* Subject detail table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-slate-500">Subject</th>
                          <th className="px-5 py-3 font-semibold text-slate-500">Date</th>
                          <th className="px-5 py-3 font-semibold text-slate-500">Time</th>
                          <th className="px-5 py-3 font-semibold text-slate-500">Duration</th>
                          <th className="px-5 py-3 font-semibold text-slate-500 text-center">Max Marks</th>
                          <th className="px-5 py-3 font-semibold text-slate-500 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sorted.map((subj, i) => {
                          const isPast   = subj.date < today;
                          const isToday  = subj.date === today;
                          return (
                            <tr key={i} className={`hover:bg-slate-50 ${isToday ? 'bg-amber-50' : ''}`}>
                              <td className="px-5 py-3.5 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  {subj.subject}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{fmtDate(subj.date)}</td>
                              <td className="px-5 py-3.5 text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />{subj.time}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{subj.duration}</td>
                              <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{subj.maxMarks}</td>
                              <td className="px-5 py-3.5 text-center">
                                {isToday
                                  ? <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">📝 Today!</span>
                                  : isPast
                                  ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />Done</span>
                                  : <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">Upcoming</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
