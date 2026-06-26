import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, FileText, User, Award, CheckCircle, XCircle, Printer, RefreshCw, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { getDocuments, getDocumentsWhere, getDocument, COLLECTIONS } from '../../api/apiService';

const ReportCards = () => {
  const { userData } = useAuth();
  const { showToast } = useDialog();
  const [students, setStudents] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);
  const [allMarks, setAllMarks] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const loadData = useCallback(async () => {
    const myClass = userData?.classAssigned;
    if (!myClass) return;
    setIsLoading(true);
    try {
      const [myClassStudents, allResults, settings] = await Promise.all([
        getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass),
        getDocuments(COLLECTIONS.MARKS),
        getDocument('settings', 'school_profile')
      ]);
      setStudents(myClassStudents);
      setAllMarks(allResults);
      setSchoolSettings(settings || {});

      const classResults = allResults.filter(r => r.class === myClass);
      const uniqueExams = [...new Set(classResults.map(r => r.examName))];
      setAvailableExams(uniqueExams);

      if (uniqueExams.length > 0 && !selectedExam) setSelectedExam(uniqueExams[0]);
      if (myClassStudents.length > 0 && !selectedStudent) setSelectedStudent(myClassStudents[0].id.toString());
    } catch (error) {
      console.error('Error loading report card data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userData?.classAssigned]);

  // Auto-refresh every 10 seconds to pick up latest marks saved by teacher
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Compile Report Card Data
  const reportData = useMemo(() => {
    if (!selectedExam || !selectedStudent) return null;

    const studentObj = students.find(s => s.id.toString() === selectedStudent);
    if (!studentObj) return null;

    // FIX: Case-insensitive match to handle typos in exam names
    const examRecords = allMarks.filter(
      r =>
        r.examName?.trim().toLowerCase() === selectedExam.trim().toLowerCase() &&
        r.class === userData?.classAssigned
    );

    let totalMaxMarks = 0;
    let totalObtainedMarks = 0;
    let hasFailedSubject = false;
    let allRemarks = [];

    const subjectsList = examRecords.map(record => {
      // Find this student in the record
      const studentResult = record.marks.find(m => m.studentId.toString() === selectedStudent);
      
      const maxM = record.maxMarks || 100;
      let marksObt = 0;
      let status = 'Present';
      let grade = 'FAIL';
      let isFail = true;
      let remark = '';

      if (studentResult) {
        status = studentResult.status || 'Present';
        remark = studentResult.remarks || '';

        if (status === 'Present') {
          // FIX: null marks (absent stored as null) defaults to 0 safely
          marksObt = studentResult.marks ?? 0;
          const percentage = maxM > 0 ? (marksObt / maxM) * 100 : 0;
          totalMaxMarks += maxM;
          totalObtainedMarks += marksObt;
          
          if (percentage >= 90) { grade = 'A+'; isFail = false; }
          else if (percentage >= 80) { grade = 'A'; isFail = false; }
          else if (percentage >= 70) { grade = 'B'; isFail = false; }
          else if (percentage >= 60) { grade = 'C'; isFail = false; }
          else if (percentage >= 35) { grade = 'D'; isFail = false; }
          else { grade = 'F'; isFail = true; }
        } else if (status === 'Absent') {
          grade = 'AB';
          isFail = true;
          totalMaxMarks += maxM; // Absent counts towards total possible
        } else if (status === 'Medical') {
          grade = 'ML';
          isFail = false; // Medical might not strictly fail them, but doesn't add marks
        }

        if (remark) allRemarks.push(`${record.subject}: ${remark}`);
      } else {
        // Data not entered for this student in this subject yet
        status = 'Not Entered';
        grade = '-';
        isFail = false;
      }

      if (isFail) hasFailedSubject = true;

      return {
        subject: record.subject,
        maxMarks: maxM,
        marksObtained: status === 'Present' ? marksObt : status,
        grade,
        isFail
      };
    });

    const overallPercentage = totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) : 0;
    const finalResult = hasFailedSubject ? 'FAIL' : 'PASS';

    return {
      student: studentObj,
      subjects: subjectsList,
      totalMaxMarks,
      totalObtainedMarks,
      overallPercentage,
      finalResult,
      overallRemarks: allRemarks.join(' | ')
    };

  }, [selectedExam, selectedStudent, students, userData?.classAssigned]);

  const generatePDF = () => {
    if (!reportData) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // School Header
      doc.setFontSize(24);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(schoolSettings.schoolName || "Shala ERP Public School", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(schoolSettings.schoolAddress || "123 Education Lane, Knowledge City, State - 400001", pageWidth / 2, 26, { align: "center" });
      doc.text(`Ph: ${schoolSettings.schoolPhone || "+91 9876543210"} | Email: ${schoolSettings.schoolEmail || "info@shalaerp.com"}`, pageWidth / 2, 31, { align: "center" });

      // Separator Line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 35, pageWidth - 14, 35);

      // Report Card Title
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("STUDENT REPORT CARD", pageWidth / 2, 45, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Examination: ${selectedExam}`, pageWidth / 2, 52, { align: "center" });

      // Student Details Box
      doc.setDrawColor(59, 130, 246); // Blue border
      doc.setFillColor(239, 246, 255); // Light blue bg
      doc.roundedRect(14, 58, pageWidth - 28, 25, 3, 3, "FD");

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`Student Name: ${reportData.student.name}`, 20, 67);
      doc.text(`Roll Number: ${reportData.student.rollNo}`, 20, 76);
      
      doc.text(`Class: ${userData?.classAssigned || 'N/A'}`, pageWidth / 2 + 10, 67);
      doc.text(`Parent Name: ${reportData.student.parentName || 'N/A'}`, pageWidth / 2 + 10, 76);

      // Marks Table
      const tableBody = reportData.subjects.map(sub => [
        sub.subject,
        sub.maxMarks,
        sub.marksObtained,
        sub.grade
      ]);

      autoTable(doc, {
        startY: 90,
        head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], halign: 'center' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            const val = data.cell.raw;
            if (val === 'F' || val === 'AB' || val === 'FAIL') data.cell.styles.textColor = [220, 38, 38];
            else if (val !== '-' && val !== 'ML') data.cell.styles.textColor = [22, 163, 74];
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY;

      // Summary Box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, finalY + 10, pageWidth - 28, 30, 3, 3, "FD");

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Grand Total: ${reportData.totalObtainedMarks} / ${reportData.totalMaxMarks}`, 20, finalY + 20);
      doc.text(`Percentage: ${reportData.overallPercentage}%`, pageWidth / 2, finalY + 20);
      
      doc.setFont("helvetica", "bold");
      const resultText = `Final Result: ${reportData.finalResult}`;
      doc.setTextColor(reportData.finalResult === 'PASS' ? 22 : 220, reportData.finalResult === 'PASS' ? 163 : 38, reportData.finalResult === 'PASS' ? 74 : 38);
      doc.text(resultText, 20, finalY + 30);

      // Remarks
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(`Teacher Remarks: ${reportData.overallRemarks || 'No specific remarks.'}`, 20, finalY + 50, { maxWidth: pageWidth - 40 });

      // Signatures
      doc.setDrawColor(148, 163, 184);
      doc.line(20, finalY + 80, 80, finalY + 80);
      doc.line(pageWidth - 80, finalY + 80, pageWidth - 20, finalY + 80);
      
      doc.setFont("helvetica", "normal");
      doc.text("Class Teacher Signature", 50, finalY + 86, { align: "center" });
      doc.text("Principal Signature", pageWidth - 50, finalY + 86, { align: "center" });

      doc.save(`Marksheet_${reportData.student.name.replace(/\s+/g, '_')}_${selectedExam.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      showToast('Error generating PDF', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Final Marksheet Generator</h1>
            <p className="text-slate-500">Compile subject marks into official report cards</p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="ml-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            {isLoading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <RefreshCw className="w-5 h-5" />}
          </button>
        </div>
        <button 
          onClick={generatePDF}
          disabled={!reportData || reportData.subjects.length === 0}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-5 h-5 mr-2" /> Print Official Marksheet
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Examination</label>
            {availableExams.length > 0 ? (
              <select 
                value={selectedExam} 
                onChange={e => setSelectedExam(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none bg-slate-50"
              >
                {availableExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm">
                No exam records found. Please enter Exam Marks first.
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Student</label>
            {students.length > 0 ? (
              <select 
                value={selectedStudent} 
                onChange={e => setSelectedStudent(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none bg-slate-50"
              >
                {students.map(s => <option key={s.id} value={s.id}>{s.rollNo} - {s.name}</option>)}
              </select>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                No students found in your class.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HTML Preview */}
      {reportData && reportData.subjects.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8 print:shadow-none print:border-none">
          <div className="bg-slate-900 text-white p-8 text-center relative">
            <Award className="w-16 h-16 absolute top-8 left-8 text-white/10" />
            <Award className="w-16 h-16 absolute top-8 right-8 text-white/10" />
            <h2 className="text-3xl font-bold tracking-wider mb-2">{schoolSettings.schoolName || "Shala ERP Public School"}</h2>
            <p className="text-slate-400 text-sm">{schoolSettings.schoolAddress || "123 Education Lane, Knowledge City, State - 400001"}</p>
            <div className="mt-6 inline-block bg-white/10 px-6 py-2 rounded-full border border-white/20">
              <h3 className="text-xl font-semibold">{selectedExam} - Report Card</h3>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between border-b border-slate-200 pb-6 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Student Name</p>
                <p className="text-lg font-bold text-slate-800 flex items-center"><User className="w-5 h-5 mr-2 text-primary"/>{reportData.student.name}</p>
              </div>
              <div className="space-y-2 mt-4 md:mt-0">
                <p className="text-sm text-slate-500">Roll Number</p>
                <p className="text-lg font-bold text-slate-800">{reportData.student.rollNo}</p>
              </div>
              <div className="space-y-2 mt-4 md:mt-0">
                <p className="text-sm text-slate-500">Class</p>
                <p className="text-lg font-bold text-slate-800">{userData?.classAssigned}</p>
              </div>
            </div>

            <table className="w-full text-left mb-8">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="py-4 px-4 font-semibold text-slate-700">Subject</th>
                  <th className="py-4 px-4 font-semibold text-slate-700 text-center">Max Marks</th>
                  <th className="py-4 px-4 font-semibold text-slate-700 text-center">Marks Obtained</th>
                  <th className="py-4 px-4 font-semibold text-slate-700 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.subjects.map((sub, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-4 px-4 font-medium text-slate-800">{sub.subject}</td>
                    <td className="py-4 px-4 text-center text-slate-600">{sub.maxMarks}</td>
                    <td className="py-4 px-4 text-center font-medium text-slate-800">{sub.marksObtained}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${sub.isFail ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {sub.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Grand Total</p>
                  <p className="text-2xl font-bold text-slate-800">{reportData.totalObtainedMarks} <span className="text-lg text-slate-400 font-medium">/ {reportData.totalMaxMarks}</span></p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Overall Percentage</p>
                  <p className="text-2xl font-bold text-slate-800">{reportData.overallPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Final Result</p>
                  <div className="flex items-center">
                    {reportData.finalResult === 'PASS' 
                      ? <><CheckCircle className="w-8 h-8 text-green-500 mr-2"/><span className="text-2xl font-bold text-green-600">PASS</span></>
                      : <><XCircle className="w-8 h-8 text-red-500 mr-2"/><span className="text-2xl font-bold text-red-600">FAIL</span></>
                    }
                  </div>
                </div>
              </div>
            </div>

            {reportData.overallRemarks && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Teacher Remarks:</h4>
                <p className="text-slate-600 italic">{reportData.overallRemarks}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        selectedExam && selectedStudent && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No marks recorded yet</h3>
            <p className="text-slate-500 mt-1">Please enter marks for this exam to generate a report card.</p>
          </div>
        )
      )}
    </div>
  );
};

export default ReportCards;
