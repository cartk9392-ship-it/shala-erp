import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { getDocumentsWhere, addDocument, updateDocument, getDocuments, COLLECTIONS } from '../../api/apiService';

const Attendance = () => {
  const { userData } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const myClass = userData?.classAssigned;
        if (!myClass) return;
        const studs = await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass);
        setStudents(studs.map(s => ({ ...s, status: 'Present' })));
      } catch (e) { console.error(e); }
    };
    loadStudents();
  }, [userData?.classAssigned]);

  const toggleStatus = (id) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' };
      }
      return s;
    }));
  };

  const markAll = (status) => {
    setStudents(students.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    const attendanceRecord = {
      date,
      class: userData?.classAssigned,
      records: students.map(s => ({ studentId: s.id, status: s.status }))
    };
    try {
      const docId = `${userData?.classAssigned}_${date}`;
      await updateDocument(COLLECTIONS.ATTENDANCE, docId, attendanceRecord);
      alert('Attendance saved successfully!');
    } catch (e) { console.error(e); alert('Error saving attendance.'); }
  };

  const generateMonthlyReport = async () => {
    if (students.length === 0) {
      alert("No students found to generate a report.");
      return;
    }

    try {
      // Landscape mode for wide table
      const doc = new jsPDF('landscape');
      
      const targetDate = new Date(date);
      const currentMonth = targetDate.getMonth();
      const currentYear = targetDate.getFullYear();
      const monthName = targetDate.toLocaleString('default', { month: 'long' });
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Fetch all attendance
      const allAttendance = await getDocuments(COLLECTIONS.ATTENDANCE);
      
      // Filter for current month and year
      const monthRecords = allAttendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      // Prepare Headers
      const headRow = ['Roll No', 'Student Name'];
      for(let i=1; i<=daysInMonth; i++) {
        headRow.push(i.toString());
      }
      headRow.push('Total P', 'Total A');

      // Calculate matrix data
      const reportData = students.map(student => {
        let presentCount = 0;
        let absentCount = 0;
        const rowData = [student.rollNo, student.name];
        
        for (let day = 1; day <= daysInMonth; day++) {
          // Format date as YYYY-MM-DD exactly as saved in state
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const dayRecord = monthRecords.find(r => r.date === dateStr);
          let status = '-';
          
          if (dayRecord) {
            const studentRecord = dayRecord.records.find(r => r.studentId === student.id);
            if (studentRecord) {
              if (studentRecord.status === 'Present') { status = 'P'; presentCount++; }
              if (studentRecord.status === 'Absent') { status = 'A'; absentCount++; }
            }
          }
          rowData.push(status);
        }
        
        rowData.push(presentCount.toString(), absentCount.toString());
        return rowData;
      });

      // Draw PDF Header
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('Monthly Attendance Register', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Class: ${userData?.classAssigned || 'N/A'}    |    Month: ${monthName} ${currentYear}`, 14, 30);

      // Draw AutoTable
      autoTable(doc, {
        startY: 36,
        head: [headRow],
        body: reportData,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], 
          fontSize: 8, 
          halign: 'center',
          textColor: 255
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 2, 
          halign: 'center',
          lineColor: [226, 232, 240], // border-slate-200
          lineWidth: 0.1
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 16 },
          1: { halign: 'left', cellWidth: 35 }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const val = data.cell.raw;
            if (val === 'P') {
              data.cell.styles.textColor = [22, 163, 74]; // green-600
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'A') {
              data.cell.styles.textColor = [220, 38, 38]; // red-600
              data.cell.styles.fontStyle = 'bold';
            } else if (val === '-') {
              data.cell.styles.textColor = [156, 163, 175]; // slate-400
            } else if (data.column.index === data.table.columns.length - 2) {
              // Total P column
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === data.table.columns.length - 1) {
              // Total A column
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      doc.save(`Class_Register_${monthName}_${currentYear}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error generating PDF. Check console for details.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Attendance</h1>
          <p className="text-slate-500">Mark attendance for your class</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <CalendarIcon className="w-5 h-5 text-slate-400 mr-2" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="focus:outline-none text-slate-700 font-medium bg-transparent"
            />
          </div>
          <button 
            onClick={generateMonthlyReport}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition flex items-center shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Monthly Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm font-medium text-slate-600">
            Total Students: {students.length} | Present: {students.filter(s => s.status === 'Present').length} | Absent: {students.filter(s => s.status === 'Absent').length}
          </span>
          <div className="space-x-2">
            <button onClick={() => markAll('Present')} className="text-xs font-medium px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition">Mark All Present</button>
            <button onClick={() => markAll('Absent')} className="text-xs font-medium px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">Mark All Absent</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Roll No</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Student Name</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{student.rollNo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.name}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleStatus(student.id)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        student.status === 'Present' 
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200' 
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                      }`}
                    >
                      {student.status === 'Present' ? (
                        <><CheckCircle className="w-4 h-4 mr-1.5" /> Present</>
                      ) : (
                        <><XCircle className="w-4 h-4 mr-1.5" /> Absent</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No students found. Add students first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={students.length === 0}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
