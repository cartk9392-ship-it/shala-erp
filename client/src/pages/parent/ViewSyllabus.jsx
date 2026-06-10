import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp, RefreshCw, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocumentsWhere, COLLECTIONS } from '../../api/apiService';

const STATUS_CONFIG = {
  pending:     { label: 'Not Started', color: 'bg-slate-100 text-slate-500',  icon: Circle,       dot: 'bg-slate-300' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700',  icon: Clock,        dot: 'bg-amber-400' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700',  icon: CheckCircle2, dot: 'bg-green-500' },
};

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ViewSyllabus() {
  const { userData } = useAuth();
  const [childClass, setChildClass] = useState('');
  const [syllabusRecords, setSyllabusRecords] = useState([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});

  const loadData = useCallback(async () => {
    const studentId = userData?.studentId;
    if (!studentId) return;
    setLoading(true);
    try {
      const child = await getDocument(COLLECTIONS.STUDENTS, studentId.toString());
      const cls = child?.class;
      setChildClass(cls || '');
      if (!cls) return;

      const records = await getDocumentsWhere(COLLECTIONS.SYLLABUS, 'class', '==', cls);
      setSyllabusRecords(records);
      if (!activeSubject && records.length > 0) setActiveSubject(records[0].subject);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userData?.studentId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeRecord = syllabusRecords.find(r => r.subject === activeSubject);
  const topics = activeRecord?.topics || [];

  const stats = useMemo(() => {
    const total = topics.length;
    const done  = topics.filter(t => t.status === 'completed').length;
    const prog  = topics.filter(t => t.status === 'in_progress').length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, prog, pending: total - done - prog, pct };
  }, [topics]);

  // Group by chapter
  const grouped = useMemo(() => {
    const map = {};
    topics.forEach(t => {
      const ch = t.chapter?.trim() || 'General';
      if (!map[ch]) map[ch] = [];
      map[ch].push(t);
    });
    return map;
  }, [topics]);

  const toggleChapter = ch => setExpandedChapters(p => ({ ...p, [ch]: !p[ch] }));

  // Progress ring component
  const ProgressRing = ({ pct, size = 64, stroke = 5 }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3b82f6" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Syllabus Tracker</h1>
          <p className="text-slate-500">Class <strong>{childClass || '—'}</strong> — see what's been taught</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading && syllabusRecords.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading syllabus...</p>
        </div>
      ) : syllabusRecords.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <BookOpen className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Syllabus Published Yet</h3>
          <p className="text-slate-400 mt-1">Your teacher hasn't added any syllabus topics yet.</p>
        </div>
      ) : (
        <>
          {/* Subject cards (overview) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {syllabusRecords.map(record => {
              const t = record.topics || [];
              const done = t.filter(x => x.status === 'completed').length;
              const pct  = t.length > 0 ? Math.round((done / t.length) * 100) : 0;
              const isActive = record.subject === activeSubject;
              return (
                <button
                  key={record.subject}
                  onClick={() => setActiveSubject(record.subject)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isActive ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-slate-100 bg-white shadow-sm hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{record.subject}</p>
                    <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{done}/{t.length} topics done</p>
                </button>
              );
            })}
          </div>

          {/* Detail view */}
          {activeSubject && (
            <div className="space-y-4">
              {/* Stats + ring */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Ring */}
                  <div className="relative flex-shrink-0">
                    <ProgressRing pct={stats.pct} size={80} stroke={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{stats.pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-800 mb-3">{activeSubject} — Syllabus Progress</h2>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-sm text-slate-600"><strong>{stats.done}</strong> Completed</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-sm text-slate-600"><strong>{stats.prog}</strong> In Progress</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="text-sm text-slate-600"><strong>{stats.pending}</strong> Pending</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /><span className="text-sm text-slate-600"><strong>{stats.total}</strong> Total</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapter-wise topics */}
              {Object.entries(grouped).map(([chapter, chTopics]) => {
                const chDone = chTopics.filter(t => t.status === 'completed').length;
                const isOpen = expandedChapters[chapter] !== false;
                return (
                  <div key={chapter} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                      onClick={() => toggleChapter(chapter)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 text-sm">{chapter}</h3>
                          <p className="text-xs text-slate-400">{chDone}/{chTopics.length} completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${chTopics.length > 0 ? (chDone / chTopics.length) * 100 : 0}%` }} />
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="divide-y divide-slate-50">
                        {chTopics.map(topic => {
                          const cfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
                          const Icon = cfg.icon;
                          return (
                            <div key={topic.topicId} className="flex items-start gap-3 px-5 py-3.5">
                              <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                                topic.status === 'completed' ? 'bg-green-500 text-white' :
                                topic.status === 'in_progress' ? 'bg-amber-50 border-2 border-amber-400' :
                                'bg-slate-100 border-2 border-slate-200'
                              }`}>
                                {topic.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {topic.status === 'in_progress' && <Clock className="w-3 h-3 text-amber-500" />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${topic.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                  {topic.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                    <Icon className="w-3 h-3" /> {cfg.label}
                                  </span>
                                  {topic.dateCovered && topic.status === 'completed' && (
                                    <span className="text-xs text-slate-400">Covered: {fmtDate(topic.dateCovered)}</span>
                                  )}
                                  {topic.notes && (
                                    <span className="text-xs text-slate-400 italic">"{topic.notes}"</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
