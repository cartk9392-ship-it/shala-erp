import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Trash2, Save, Edit2, CheckCircle,
  Clock, BookOpen, AlertCircle, ChevronDown, ChevronUp, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getDocumentsWhere, updateDocument, deleteDocument, COLLECTIONS
} from '../../api/apiService';

// Unique doc ID
const buildScheduleId = (className, examName) =>
  `${className}_${examName.trim()}`.replace(/\s+/g, '_');

const SUBJECTS_DEFAULT = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];
const DURATIONS = ['30 mins', '1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours'];

// Status badge styling
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

// Auto-compute status from subject dates
const computeStatus = (subjects) => {
  if (!subjects || subjects.length === 0) return 'upcoming';
  const today = new Date().toISOString().split('T')[0];
  const dates = subjects.map(s => s.date).filter(Boolean).sort();
  if (!dates.length) return 'upcoming';
  if (today < dates[0]) return 'upcoming';
  if (today > dates[dates.length - 1]) return 'completed';
  return 'ongoing';
};

// Format date nicely
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ExamSchedule() {
  const { userData } = useAuth();
  const myClass = userData?.classAssigned;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // null = new
  const [formExamName, setFormExamName] = useState('');
  const [formSubjects, setFormSubjects] = useState([
    { subject: '', date: '', time: '09:00', duration: '1 hour', maxMarks: 100 }
  ]);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Load schedules ─────────────────────────────────────────────────────────
  const loadSchedules = useCallback(async () => {
    if (!myClass) return;
    setLoading(true);
    try {
      const data = await getDocumentsWhere(COLLECTIONS.EXAM_SCHEDULES, 'class', '==', myClass);
      // Sort newest first
      data.sort((a, b) => new Date(b.createdAt?.seconds * 1000 || 0) - new Date(a.createdAt?.seconds * 1000 || 0));
      setSchedules(data);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [myClass]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // ── Open form for NEW schedule ────────────────────────────────────────────
  const openNewForm = () => {
    setEditingSchedule(null);
    setFormExamName('');
    setFormSubjects([{ subject: '', date: '', time: '09:00', duration: '1 hour', maxMarks: 100 }]);
    setShowForm(true);
  };

  // ── Open form to EDIT existing ────────────────────────────────────────────
  const openEditForm = (schedule) => {
    setEditingSchedule(schedule);
    setFormExamName(schedule.examName);
    setFormSubjects(schedule.subjects?.length
      ? schedule.subjects.map(s => ({ ...s }))
      : [{ subject: '', date: '', time: '09:00', duration: '1 hour', maxMarks: 100 }]
    );
    setShowForm(true);
  };

  // ── Add/remove subject rows ───────────────────────────────────────────────
  const addSubjectRow = () =>
    setFormSubjects(prev => [...prev, { subject: '', date: '', time: '09:00', duration: '1 hour', maxMarks: 100 }]);

  const removeSubjectRow = (idx) =>
    setFormSubjects(prev => prev.filter((_, i) => i !== idx));

  const updateSubjectRow = (idx, field, value) =>
    setFormSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  // ── Save schedule ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formExamName.trim()) { alert('Exam name required'); return; }
    if (formSubjects.some(s => !s.subject || !s.date)) {
      alert('Please fill subject name and date for all rows'); return;
    }

    setSaving(true);
    const docId = editingSchedule?.id || buildScheduleId(myClass, formExamName);
    const status = computeStatus(formSubjects);

    try {
      await updateDocument(COLLECTIONS.EXAM_SCHEDULES, docId, {
        examName: formExamName.trim(),
        class: myClass,
        createdBy: userData?.id || userData?._id,
        status,
        subjects: formSubjects.map(s => ({
          subject: s.subject,
          date: s.date,
          time: s.time,
          duration: s.duration,
          maxMarks: Number(s.maxMarks) || 100,
        }))
      });
      setShowForm(false);
      await loadSchedules();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save schedule. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete schedule ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteDocument(COLLECTIONS.EXAM_SCHEDULES, id);
      setDeleteConfirm(null);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Delete failed. Try again.');
    }
  };

  // ── Sort subjects by date ─────────────────────────────────────────────────
  const sortedSubjects = (subjects) =>
    [...(subjects || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exam Schedule</h1>
          <p className="text-slate-500">Create and manage exam timetables for Class <strong>{myClass || '—'}</strong></p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSchedules} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={openNewForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> New Exam Schedule
          </button>
        </div>
      </div>

      {/* ── CREATE / EDIT FORM ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <CalendarDays className="w-5 h-5" />
              <h2 className="font-semibold text-lg">
                {editingSchedule ? `Edit: ${editingSchedule.examName}` : 'New Exam Schedule'}
              </h2>
            </div>
            <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Exam Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam / Test Name *</label>
              <input
                type="text"
                value={formExamName}
                onChange={e => setFormExamName(e.target.value)}
                disabled={!!editingSchedule}
                placeholder="e.g. Unit Test 1, Half Yearly Exam"
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/40 outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
              />
              {editingSchedule && <p className="text-xs text-slate-400 mt-1">Exam name cannot be changed after creation.</p>}
            </div>

            {/* Subject Rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Subjects & Schedule *</label>
                <button onClick={addSubjectRow} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Subject
                </button>
              </div>

              <div className="space-y-3">
                {formSubjects.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {/* Subject name */}
                    <div className="sm:col-span-1">
                      <label className="text-xs text-slate-500 mb-1 block">Subject</label>
                      <input
                        type="text"
                        list={`subjects-list-${idx}`}
                        value={row.subject}
                        onChange={e => updateSubjectRow(idx, 'subject', e.target.value)}
                        placeholder="Mathematics"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                      />
                      <datalist id={`subjects-list-${idx}`}>
                        {SUBJECTS_DEFAULT.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    {/* Date */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => updateSubjectRow(idx, 'date', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                      />
                    </div>
                    {/* Time */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Start Time</label>
                      <input
                        type="time"
                        value={row.time}
                        onChange={e => updateSubjectRow(idx, 'time', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                      />
                    </div>
                    {/* Duration */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Duration</label>
                      <select
                        value={row.duration}
                        onChange={e => updateSubjectRow(idx, 'duration', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                      >
                        {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {/* Max Marks + Delete */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Max Marks</label>
                        <input
                          type="number" min="1"
                          value={row.maxMarks}
                          onChange={e => updateSubjectRow(idx, 'maxMarks', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                        />
                      </div>
                      {formSubjects.length > 1 && (
                        <button
                          onClick={() => removeSubjectRow(idx)}
                          className="mt-5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 transition"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE LIST ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <CalendarDays className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Exam Schedules Yet</h3>
          <p className="text-slate-400 mt-1 mb-6">Click "New Exam Schedule" to create your first exam timetable.</p>
          <button onClick={openNewForm} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4 inline mr-1.5" /> Create Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map(schedule => {
            const isExpanded = expandedId === schedule.id;
            const status = computeStatus(schedule.subjects);
            const sorted = sortedSubjects(schedule.subjects);
            const startDate = sorted[0]?.date;
            const endDate = sorted[sorted.length - 1]?.date;

            return (
              <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Schedule header row */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800">{schedule.examName}</h3>
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
                  <div className="flex items-center gap-2 ml-4">
                    {/* Edit button */}
                    <button
                      onClick={e => { e.stopPropagation(); openEditForm(schedule); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Schedule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(schedule.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Expand */}
                    {isExpanded
                      ? <ChevronUp className="w-5 h-5 text-slate-400" />
                      : <ChevronDown className="w-5 h-5 text-slate-400" />
                    }
                  </div>
                </div>

                {/* Delete confirmation banner */}
                {deleteConfirm === schedule.id && (
                  <div className="bg-red-50 border-t border-red-200 px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-800">⚠️ Delete "{schedule.examName}" schedule?</p>
                      <p className="text-xs text-red-500 mt-0.5">This only deletes the schedule. Entered marks are not affected.</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-600">Cancel</button>
                      <button onClick={() => handleDelete(schedule.id)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, Delete</button>
                    </div>
                  </div>
                )}

                {/* Expanded subject table */}
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
                          const today = new Date().toISOString().split('T')[0];
                          const isPast   = subj.date < today;
                          const isToday  = subj.date === today;
                          return (
                            <tr key={i} className={`hover:bg-slate-50 ${isToday ? 'bg-amber-50' : ''}`}>
                              <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                {subj.subject}
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{fmtDate(subj.date)}</td>
                              <td className="px-5 py-3.5 text-slate-600 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> {subj.time}
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{subj.duration}</td>
                              <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{subj.maxMarks}</td>
                              <td className="px-5 py-3.5 text-center">
                                {isToday
                                  ? <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">Today!</span>
                                  : isPast
                                  ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit mx-auto"><CheckCircle className="w-3 h-3" />Done</span>
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
