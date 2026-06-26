import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDialog } from '../../context/DialogContext';
import { Save, ClipboardList, RefreshCw, Download, Award, TrendingUp, Users, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { getDocuments, getDocumentsWhere, updateDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';

// Normalize exam name + subject into a consistent document ID
const buildDocId = (className, examName, subject) =>
  `${className}_${examName.trim()}_${subject.trim()}`.replace(/\s+/g, '_');

const ExamMarks = () => {
  const { showToast, showConfirm } = useDialog();
  const { userData } = useAuth();

  // Test Configuration State
  const [examName, setExamName] = useState('Surprise Test 1');
  const [subject, setSubject] = useState('Mathematics');
  const [maxMarks, setMaxMarks] = useState(50);

  // Data State
  const [students, setStudents] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [allMarksRecords, setAllMarksRecords] = useState([]); // full records for management
  const [subjectHistory, setSubjectHistory] = useState(['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies']);
  const [showHistory, setShowHistory] = useState(false);

  // UI State
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load exam/subject history ──────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const myClass = userData?.classAssigned;
      if (!myClass) return;
      const allResults = await getDocuments(COLLECTIONS.MARKS);
      const myResults = allResults.filter(r => r.class === myClass);

      setAllMarksRecords(myResults); // store full records
      const uniqueExams = [...new Set(myResults.map(r => r.examName))];
      const uniqueSubjects = [...new Set(myResults.map(r => r.subject))];

      setExamHistory(uniqueExams);
      if (uniqueSubjects.length > 0) {
        setSubjectHistory(prev => [...new Set([...prev, ...uniqueSubjects])]);
      }
    } catch (error) {
      console.error('Error loading exam history:', error);
    }
  }, [userData?.classAssigned]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Load students + existing marks for current exam/subject ───────────────
  const loadStudentsAndMarks = useCallback(async () => {
    const myClass = userData?.classAssigned;
    if (!myClass) return;

    try {
      const myClassStudents = await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass);
      const allResults = await getDocuments(COLLECTIONS.MARKS);

      // Case-insensitive match to prevent duplicate records from typos
      const existingRecord = allResults.find(
        r =>
          r.examName?.trim().toLowerCase() === examName.trim().toLowerCase() &&
          r.subject?.trim().toLowerCase() === subject.trim().toLowerCase() &&
          r.class === myClass
      );

      if (existingRecord) {
        setMaxMarks(existingRecord.maxMarks || 50);
        setIsUpdating(true);
        setEditingId(existingRecord.id || existingRecord._id);

        const loadedStudents = myClassStudents.map(student => {
          const savedData = existingRecord.marks?.find(
            m => m.studentId === student.id || m.studentId === student._id
          );
          return {
            ...student,
            // FIX: null means absent/not entered, 0 means present but scored 0
            marks: savedData ? (savedData.marks ?? 0) : 0,
            status: savedData ? (savedData.status || 'Present') : 'Present',
            remarks: savedData ? (savedData.remarks || '') : ''
          };
        });
        setStudents(loadedStudents);
      } else {
        setIsUpdating(false);
        setEditingId(null);
        setStudents(myClassStudents.map(s => ({ ...s, marks: 0, status: 'Present', remarks: '' })));
      }
    } catch (error) {
      console.error('Error loading marks:', error);
    }
  }, [userData?.classAssigned, examName, subject]);

  useEffect(() => {
    loadStudentsAndMarks();
  }, [loadStudentsAndMarks]);

  // ── Data change handler ────────────────────────────────────────────────────
  const handleDataChange = (id, field, value) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      let finalValue = value;
      if (field === 'marks') {
        finalValue = value === '' ? 0 : Number(value);
        if (finalValue > maxMarks) finalValue = maxMarks;
        if (finalValue < 0) finalValue = 0;
      }
      // When status changes TO absent/medical, clear marks
      if (field === 'status' && value !== 'Present') {
        return { ...s, [field]: finalValue, marks: 0 };
      }
      return { ...s, [field]: finalValue };
    }));
  };

  // ── Grade calculator ───────────────────────────────────────────────────────
  const getGradeInfo = (marks, status) => {
    if (status === 'Absent')  return { text: 'AB',   color: 'text-red-600 bg-red-50',    isFail: true  };
    if (status === 'Medical') return { text: 'ML',   color: 'text-amber-600 bg-amber-50', isFail: false };
    const pct = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
    if (pct >= 90) return { text: 'A+',   color: 'text-green-600',   isFail: false };
    if (pct >= 80) return { text: 'A',    color: 'text-emerald-600', isFail: false };
    if (pct >= 70) return { text: 'B',    color: 'text-blue-600',    isFail: false };
    if (pct >= 60) return { text: 'C',    color: 'text-amber-600',   isFail: false };
    if (pct >= 35) return { text: 'D',    color: 'text-orange-500',  isFail: false };
    return             { text: 'FAIL', color: 'text-red-600 bg-red-50', isFail: true };
  };

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (students.length === 0) return { avg: 0, highest: 0, pass: 0, fail: 0 };
    const presentStudents = students.filter(s => s.status === 'Present');
    if (presentStudents.length === 0) return { avg: 0, highest: 0, pass: 0, fail: 0 };
    let sum = 0, highest = 0, pass = 0, fail = 0;
    presentStudents.forEach(s => {
      sum += s.marks;
      if (s.marks > highest) highest = s.marks;
      if (getGradeInfo(s.marks, s.status).isFail) fail++; else pass++;
    });
    const totalFail = fail + students.filter(s => s.status === 'Absent').length;
    return { avg: (sum / presentStudents.length).toFixed(1), highest, pass, fail: totalFail };
  }, [students, maxMarks]);

  // ── Save / Update ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const myClass = userData?.classAssigned;
    if (!myClass || !examName.trim() || !subject.trim()) {
      showToast('Please fill in Exam Name, Subject, and Max Marks.', 'warning');
      return;
    }

    setSaveStatus('saving');

    // FIX: Always use normalized ID → prevents typo duplicates
    const docId = buildDocId(myClass, examName, subject);

    const resultsRecord = {
      examName: examName.trim(),
      subject: subject.trim(),
      class: myClass,
      maxMarks,
      dateSaved: new Date().toISOString(),
      // FIX: Store null for absent students instead of 0
      marks: students.map(s => ({
        studentId: s.id,
        marks: s.status !== 'Present' ? null : s.marks,
        status: s.status,
        remarks: s.remarks
      }))
    };

    try {
      // FIX: updateDocument with upsert → always works whether new or existing
      await updateDocument(COLLECTIONS.MARKS, docId, resultsRecord);
      setEditingId(docId);
      setIsUpdating(true);
      setSaveStatus('success');

      // Refresh history after save
      await loadHistory();

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving marks:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // ── Refresh current gradebook ──────────────────────────────────────────────
  const handleRefresh = async () => {
    await loadStudentsAndMarks();
  };

  // ── Delete entire test record ──────────────────────────────────────────────
  const handleDeleteTest = async () => {
    if (!editingId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(COLLECTIONS.MARKS, editingId);
      setIsUpdating(false);
      setEditingId(null);
      setStudents(prev => prev.map(s => ({ ...s, marks: 0, status: 'Present', remarks: '' })));
      await loadHistory();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting test:', error);
      showToast('Failed to delete test record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Delete any exam record directly ────────────────────────────────────────
  const deleteExamRecord = async (record) => {
    const docId = record.id || record._id;
    try {
      await deleteDocument(COLLECTIONS.MARKS, docId);
      setAllMarksRecords(prev => prev.filter(r => (r.id || r._id) !== docId));
      // If currently editing this record, reset form
      if (editingId === docId) {
        setIsUpdating(false);
        setEditingId(null);
        setStudents(prev => prev.map(s => ({ ...s, marks: 0, status: 'Present', remarks: '' })));
      }
      await loadHistory();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Advanced Gradebook - Result Sheet', 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Class: ${userData?.classAssigned || 'N/A'}  |  Test: ${examName}  |  Subject: ${subject}  |  Max Marks: ${maxMarks}`, 14, 28);
      doc.text(`Class Average: ${analytics.avg}  |  Highest Score: ${analytics.highest}  |  Pass: ${analytics.pass}  |  Fail/Absent: ${analytics.fail}`, 14, 34);

      const tableData = students.map(s => {
        const gradeInfo = getGradeInfo(s.marks, s.status);
        return [s.rollNo, s.name, s.status, s.status === 'Present' ? s.marks : '-', gradeInfo.text, s.remarks || '-'];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Roll No', 'Student Name', 'Attendance', `Marks (Out of ${maxMarks})`, 'Grade', 'Teacher Remarks']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 25 },
          3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 5: { cellWidth: 'auto' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.raw;
            if (val === 'FAIL' || val === 'AB') data.cell.styles.textColor = [220, 38, 38];
            else if (val === 'ML') data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [22, 163, 74];
          }
        }
      });
      doc.save(`Result_${examName.replace(/\s+/g, '_')}_${subject}.pdf`);
    } catch (e) {
      console.error(e);
      showToast('Failed to generate PDF report.', 'error');
    }
  };

  // ── Save button label & style ──────────────────────────────────────────────
  const getSaveButton = () => {
    if (saveStatus === 'saving') return { label: 'Saving...', cls: 'bg-slate-500', icon: <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> };
    if (saveStatus === 'success') return { label: 'Saved!', cls: 'bg-green-600', icon: <CheckCircle className="w-4 h-4 mr-2" /> };
    if (saveStatus === 'error') return { label: 'Failed! Retry', cls: 'bg-red-600', icon: <AlertCircle className="w-4 h-4 mr-2" /> };
    if (isUpdating) return { label: 'Update Gradebook', cls: 'bg-amber-600 hover:bg-amber-700', icon: <RefreshCw className="w-4 h-4 mr-2" /> };
    return { label: 'Save Gradebook', cls: 'bg-blue-600 hover:bg-blue-700', icon: <Save className="w-4 h-4 mr-2" /> };
  };
  const saveBtn = getSaveButton();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Advanced Gradebook</h1>
          <p className="text-slate-500">Create tests, evaluate students, and generate reports</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <button
            onClick={handleRefresh}
            title="Refresh data"
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={downloadPDF}
            disabled={students.length === 0 || !isUpdating}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition flex items-center shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" /> Download Result Sheet
          </button>
        </div>
      </div>

      {/* ── Saved Exams Manager ───────────────────────────────────────────── */}
      {allMarksRecords.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700 text-sm">Saved Exams ({allMarksRecords.length} records)</span>
              <span className="text-xs text-slate-400">— Click to {showHistory ? 'hide' : 'manage & delete'}</span>
            </div>
            <span className="text-slate-400 text-lg">{showHistory ? '▲' : '▼'}</span>
          </button>

          {showHistory && (
            <div className="border-t border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-400 uppercase">Exam Name</th>
                    <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-400 uppercase">Subject</th>
                    <th className="px-5 py-2.5 text-center text-xs font-bold text-slate-400 uppercase">Max Marks</th>
                    <th className="px-5 py-2.5 text-center text-xs font-bold text-slate-400 uppercase">Students</th>
                    <th className="px-5 py-2.5 text-right text-xs font-bold text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allMarksRecords.map((rec) => (
                    <tr key={rec.id || rec._id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-slate-800">{rec.examName}</td>
                      <td className="px-5 py-3 text-slate-600">{rec.subject}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{rec.maxMarks || '—'}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{(rec.marks || []).length}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setExamName(rec.examName); setSubject(rec.subject); setShowHistory(false); }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition"
                          >Open</button>
                          <button
                            onClick={() => deleteExamRecord(rec)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-medium transition flex items-center gap-1"
                          ><Trash2 className="w-3 h-3"/>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Dashboard */}
      {isUpdating && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Class Average', value: analytics.avg, icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-blue-50 text-blue-600' },
            { label: 'Highest Score', value: analytics.highest, icon: <Award className="w-5 h-5" />, bg: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Passed', value: analytics.pass, icon: <Users className="w-5 h-5" />, bg: 'bg-green-50 text-green-600' },
            { label: 'Failed / Absent', value: analytics.fail, icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-red-50 text-red-600' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${bg}`}>{icon}</div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test / Exam Name (Type or Select)</label>
            <input
              type="text" list="exam-history" autoComplete="off"
              value={examName} onChange={e => setExamName(e.target.value)} onFocus={e => e.target.select()}
              placeholder="e.g. Surprise Math Quiz"
              className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none bg-white"
            />
            <datalist id="exam-history">{examHistory.map((ex, i) => <option key={i} value={ex} />)}</datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject (Type or Select)</label>
            <input
              type="text" list="subject-history" autoComplete="off"
              value={subject} onChange={e => setSubject(e.target.value)} onFocus={e => e.target.select()}
              placeholder="e.g. Computer Science"
              className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none bg-white"
            />
            <datalist id="subject-history">{subjectHistory.map((sub, i) => <option key={i} value={sub} />)}</datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Marks</label>
            <input
              type="number" min="1"
              value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center">
            <ClipboardList className="w-5 h-5 text-slate-500 mr-2" />
            <h2 className="font-semibold text-slate-700">{examName} — {subject} Evaluation</h2>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && (
              <span className="flex items-center text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                <RefreshCw className="w-3 h-3 mr-1" /> Updating Saved Record
              </span>
            )}
            {/* FIX: Delete test button — only shown when a saved record exists */}
            {isUpdating && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md transition"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete This Test
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">⚠️ Delete "{examName} — {subject}" permanently?</p>
              <p className="text-xs text-red-600 mt-0.5">Ye action undo nahi ho sakta. Sab students ke marks delete ho jaayenge.</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTest}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-slate-500">Roll No</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-500 min-w-[150px]">Student Name</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-500">Attendance</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-500 w-32">Marks</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-500 w-24">Grade</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-500 min-w-[200px]">Teacher Remarks (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => {
                const gradeObj = getGradeInfo(student.marks, student.status);
                const isAbsent = student.status !== 'Present';
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{student.rollNo}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">{student.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={student.status}
                        onChange={e => handleDataChange(student.id, 'status', e.target.value)}
                        className={`text-sm border rounded-lg p-1.5 outline-none font-medium ${
                          isAbsent ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Medical">Medical Leave</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <input
                          type="number" min="0" max={maxMarks}
                          disabled={isAbsent}
                          value={isAbsent ? '' : student.marks}
                          placeholder={isAbsent ? '-' : '0'}
                          onChange={e => handleDataChange(student.id, 'marks', e.target.value)}
                          className={`w-16 border rounded-lg p-1.5 text-center focus:ring-2 focus:ring-blue-500/50 outline-none font-bold ${
                            isAbsent
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : gradeObj.isFail
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-slate-200 text-slate-700'
                          }`}
                        />
                        <span className="ml-1 text-slate-400 font-medium text-xs">/{maxMarks}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold px-2 py-1 rounded-md ${gradeObj.color}`}>{gradeObj.text}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text" value={student.remarks}
                        onChange={e => handleDataChange(student.id, 'remarks', e.target.value)}
                        placeholder="E.g. Excellent work..."
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-600"
                      />
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No students found in your assigned class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={students.length === 0 || saveStatus === 'saving'}
            className={`${saveBtn.cls} text-white px-6 py-2.5 rounded-xl font-medium transition flex items-center shadow-sm disabled:opacity-50`}
          >
            {saveBtn.icon} {saveBtn.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamMarks;
