import React, { useState, useEffect, useMemo } from 'react';
import { Award, Download, User, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocuments, COLLECTIONS } from '../../api/apiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ViewResults = () => {
  const { userData } = useAuth();
  const [examResults, setExamResults] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const studentId = userData?.studentId;
      if (!studentId) return;

      try {
        const [myChild, allResults] = await Promise.all([
          getDocument(COLLECTIONS.STUDENTS, studentId.toString()),
          getDocuments(COLLECTIONS.MARKS)
        ]);
        setStudentInfo(myChild);

        const examMap = {};
        allResults.forEach(examRecord => {
          const studentResult = examRecord.marks.find(m => m.studentId.toString() === studentId.toString());
          if (studentResult) {
            if (!examMap[examRecord.examName]) {
              examMap[examRecord.examName] = { date: examRecord.dateSaved, subjects: {} };
            }
            examMap[examRecord.examName].subjects[examRecord.subject] = {
              name: examRecord.subject,
              max: examRecord.maxMarks || 100,
              obtained: studentResult.status === 'Present' ? studentResult.marks : studentResult.status,
              status: studentResult.status || 'Present',
              grade: calculateGrade(studentResult.marks, examRecord.maxMarks || 100, studentResult.status)
            };
          }
        });

        const studentExams = Object.entries(examMap).map(([examName, data]) => ({
          examName,
          date: data.date,
          subjects: Object.values(data.subjects)
        }));

        setExamResults(studentExams);
        if (studentExams.length > 0) setSelectedExam(studentExams[0].examName);
      } catch (error) {
        console.error('Error loading results:', error);
      }
    };
    loadData();
    const interval = setInterval(loadData, 8000); // Real-time polling every 8s
    return () => clearInterval(interval);
  }, [userData]);

  const calculateGrade = (marks, max, status) => {
    if (status === 'Absent') return 'AB';
    if (status === 'Medical') return 'ML';
    const percentage = (marks / max) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  };

  const currentResult = useMemo(() => {
    if (!selectedExam) return null;
    const exam = examResults.find(e => e.examName === selectedExam);
    if (!exam) return null;

    let totalMax = 0;
    let totalObtained = 0;
    let pass = true;

    exam.subjects.forEach(s => {
      if (typeof s.obtained === 'number') {
        totalMax += s.max;
        totalObtained += s.obtained;
        if ((s.obtained / s.max) * 100 < 35) pass = false;
      } else if (s.status === 'Absent') {
        totalMax += s.max;
        pass = false;
      }
    });

    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
    
    return {
      ...exam,
      totalMax,
      totalObtained,
      percentage,
      finalResult: pass ? 'PASS' : 'FAIL',
      grade: calculateGrade(totalObtained, totalMax, 'Present')
    };
  }, [selectedExam, examResults]);

  const downloadReportCard = () => {
    if (!currentResult) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Shala ERP - Student Report Card", 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Student: ${studentInfo?.name}`, 20, 35);
      doc.text(`Class: ${userData?.class}`, 20, 42);
      doc.text(`Exam: ${currentResult.examName}`, 20, 49);

      autoTable(doc, {
        startY: 55,
        head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade']],
        body: currentResult.subjects.map(s => [s.name, s.max, s.obtained, s.grade]),
      });

      const finalY = doc.lastAutoTable.finalY;
      doc.text(`Grand Total: ${currentResult.totalObtained}/${currentResult.totalMax}`, 20, finalY + 15);
      doc.text(`Percentage: ${currentResult.percentage}%`, 20, finalY + 22);
      doc.text(`Final Result: ${currentResult.finalResult}`, 20, finalY + 29);

      doc.save(`${studentInfo?.name}_Result.pdf`);
    } catch (e) {
      alert("Error generating PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exam Results</h1>
          <p className="text-slate-500">Student: <span className="font-bold text-slate-700">{studentInfo?.name || 'Loading...'}</span> | Class: {userData?.class}</p>
        </div>
        {currentResult && (
          <button 
            onClick={downloadReportCard}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center shadow-md"
          >
            <Download className="w-4 h-4 mr-2" /> Download Report Card
          </button>
        )}
      </div>

      {examResults.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {examResults.map(e => (
            <button
              key={e.examName}
              onClick={() => setSelectedExam(e.examName)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                selectedExam === e.examName 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {e.examName}
            </button>
          ))}
        </div>
      )}

      {currentResult ? (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase">{currentResult.examName}</h2>
                <p className="text-slate-500 font-bold mt-1">Final Result: <span className={currentResult.finalResult === 'PASS' ? 'text-green-600' : 'text-red-600'}>{currentResult.finalResult}</span></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8 text-center border-l border-slate-200 pl-8">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Marks</p>
                <p className="text-2xl font-black text-slate-800">{currentResult.totalObtained}<span className="text-sm text-slate-400 font-medium">/{currentResult.totalMax}</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Percentage</p>
                <p className="text-2xl font-black text-primary">{currentResult.percentage}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Grade</p>
                <p className={`text-2xl font-black ${currentResult.finalResult === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{currentResult.grade}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
              <BookOpen className="w-4 h-4 text-slate-500 mr-2" />
              <h2 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Subject Wise Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Subject Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Max Marks</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Marks Obtained</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentResult.subjects.map((subject, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{subject.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium text-center">{subject.max}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800 text-center">
                        {typeof subject.obtained === 'number' ? subject.obtained : <span className="text-red-500">{subject.obtained}</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black text-lg ${subject.grade === 'F' || subject.grade === 'AB' ? 'text-red-600' : 'text-primary'}`}>
                          {subject.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Award className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Exam Results Yet</h3>
          <p className="text-slate-400 mt-1">When the teacher uploads your child's results, they will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default ViewResults;
