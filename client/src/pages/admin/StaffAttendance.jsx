import React, { useState, useEffect } from 'react';
import { Calendar, Search, CheckCircle2, XCircle, Clock, Save, FileText, Download, List } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDocuments, addDocument, getDocument, updateDocument, COLLECTIONS } from '../../api/apiService';
import { useDialog } from '../../context/DialogContext';

const StaffAttendance = () => {
  const { showToast } = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState({}); // For daily: { teacherId: status }
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({});

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        getDocuments(COLLECTIONS.USERS),
        getDocuments(COLLECTIONS.STAFF_ATTENDANCE),
        getDocument(COLLECTIONS.SETTINGS, 'school_profile')
      ]);
      
      const [storedUsers, allAttendance, settings] = results.map(r => r.status === 'fulfilled' ? r.value : null);
      
      if (storedUsers) setTeachers(storedUsers.filter(u => u.role === 'teacher'));
      if (allAttendance) setAllAttendanceRecords(allAttendance);
      if (settings) setSchoolSettings(settings);

      if (activeTab === 'daily' && allAttendance) {
        const dateRecords = allAttendance.filter(r => r.date === selectedDate);
        const initialAttendance = {};
        dateRecords.forEach(r => {
          initialAttendance[r.teacherId] = r.status;
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error('Error loading staff attendance:', error);
    }
  };

  // Load teachers and daily attendance
  useEffect(() => {
    loadData();
  }, [selectedDate, activeTab]);

  const handleStatusChange = (teacherId, status) => {
    setAttendance(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const promises = Object.keys(attendance).map(teacherId => {
        const docId = `${teacherId}_${selectedDate}`;
        const teacher = teachers.find(t => String(t.id) === String(teacherId) || String(t._id) === String(teacherId));
        return updateDocument(COLLECTIONS.STAFF_ATTENDANCE, docId, {
          teacherId: teacherId,
          teacherName: teacher ? teacher.name : 'Unknown',
          date: selectedDate,
          status: attendance[teacherId]
        });
      });
      await Promise.all(promises);
      showToast('Staff attendance saved successfully!', 'success');
      setTimeout(() => setSuccess(''), 3000);
      await loadData(); // Reload fresh records from server
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const isWeekend = (day) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const getMonthlyDetailedData = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysCount = getDaysInMonth(year, month - 1);
    const data = {};

    teachers.forEach(teacher => {
      data[teacher.id] = {};
      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        const record = allAttendanceRecords.find(r => String(r.teacherId) === String(teacher.id) && r.date === dateStr);
        data[teacher.id][day] = record ? record.status : '-';
      }
    });

    return { data, daysCount };
  };

  const downloadPDF = () => {
    try {
      const { data, daysCount } = getMonthlyDetailedData();
      const doc = new jsPDF('l', 'mm', 'a4');
      const schoolName = (schoolSettings.schoolName || 'Shala ERP School').toUpperCase();
      const [year, monthNum] = selectedMonth.split('-');
      const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long' });

      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(schoolName, pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(schoolSettings.schoolAddress || 'Official Attendance Record', pageWidth / 2, 24, { align: 'center' });
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 30, pageWidth - 20, 30);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`STAFF ATTENDANCE REPORT - ${monthName.toUpperCase()} ${year}`, 20, 40);
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, 40, { align: 'right' });

      // Detailed Table
      const head = [['ID', 'Teacher Name', ...Array.from({ length: daysCount }, (_, i) => i + 1), 'Pres.', '%']];
      const body = teachers.map((t) => {
        const teacherDays = data[t.id];
        let pCount = 0;
        let recordedDays = 0;
        const rowData = Array.from({ length: daysCount }, (_, i) => {
          const status = teacherDays[i + 1];
          if (status !== '-') recordedDays++;
          if (status === 'Present') { pCount++; return 'P'; }
          if (status === 'Absent') return 'A';
          if (status === 'Late') return 'L';
          return '-';
        });
        const pct = recordedDays > 0 ? ((pCount / recordedDays) * 100).toFixed(0) : '0';
        return [t.id, t.name, ...rowData, pCount, `${pct}%`];
      });

      autoTable(doc, {
        startY: 55,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 6, halign: 'center', fontStyle: 'bold' },
        styles: { fontSize: 5.5, cellPadding: 0.8, halign: 'center' },
        columnStyles: { 0: { cellWidth: 8 }, 1: { halign: 'left', fontStyle: 'bold', cellWidth: 30 } },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index > 1 && cellData.column.index <= daysCount + 1) {
            const day = cellData.column.index - 1;
            if (isWeekend(day)) cellData.cell.styles.fillColor = [248, 250, 252];
            const val = cellData.cell.text[0];
            if (val === 'P') cellData.cell.styles.textColor = [5, 150, 105];
            if (val === 'A') cellData.cell.styles.textColor = [220, 38, 38];
            if (val === 'L') cellData.cell.styles.textColor = [217, 119, 6];
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('LEGEND: P=Present | A=Absent | L=Late | -=No Record', 20, finalY);
      
      doc.line(20, finalY + 20, 60, finalY + 20);
      doc.text('Principal Signature', 20, finalY + 25);
      doc.line(pageWidth - 60, finalY + 20, pageWidth - 20, finalY + 20);
      doc.text('Admin Signature', pageWidth - 60, finalY + 25);

      doc.save(`Attendance_${monthName}_${year}.pdf`);
    } catch (err) {
      console.error(err);
      showToast('Error: PDF Generation failed.', 'error');
    }
  };

  const { data: monthlyData, daysCount } = getMonthlyDetailedData();

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff Attendance</h1>
          <p className="text-slate-500 mt-1">Official daily attendance tracking and monthly reports.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List className="w-4 h-4 mr-2" /> Daily
          </button>
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4 mr-2" /> Monthly Detail
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          {activeTab === 'daily' ? (
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="outline-none text-sm font-bold text-slate-700 bg-transparent" />
          ) : (
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="outline-none text-sm font-bold text-slate-700 bg-transparent" />
          )}
        </div>

        {activeTab === 'monthly' && (
          <button onClick={downloadPDF} className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
            <Download className="w-4 h-4 mr-2" /> Download Official PDF
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-3 animate-bounce" /> {success}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              {activeTab === 'daily' ? (
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">Teacher Name</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">Status</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[150px]">Teacher</th>
                  {Array.from({ length: daysCount }, (_, i) => (
                    <th key={i} className={`px-1 py-4 text-[10px] font-bold text-center border-l border-slate-100 min-w-[32px] ${isWeekend(i+1) ? 'text-red-400' : 'text-slate-400'}`}>{i + 1}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'daily' ? (
                teachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-bold text-slate-800">{teacher.name}</div><div className="text-[10px] font-medium text-slate-400">ID: {teacher.id}</div></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {['Present', 'Late', 'Absent'].map((status) => (
                          <button key={status} onClick={() => handleStatusChange(teacher.id, status)} className={`flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border-2 ${attendance[teacher.id] === status ? (status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200') : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>
                            {status === 'Present' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                teachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">{teacher.name}</td>
                    {Array.from({ length: daysCount }, (_, i) => {
                      const day = i + 1;
                      const status = monthlyData[teacher.id][day];
                      const weekend = isWeekend(day);
                      return (
                        <td key={i} className={`px-0 py-4 text-center border-l border-slate-50 ${weekend ? 'bg-slate-50/50' : ''}`}>
                          <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[10px] font-black ${status === 'Present' ? 'text-emerald-600' : status === 'Absent' ? 'text-red-600' : status === 'Late' ? 'text-amber-600' : 'text-slate-200'}`}>
                            {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'Late' ? 'L' : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {activeTab === 'monthly' && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-6 justify-center text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Present (P)</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Absent (A)</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Late (L)</span>
          </div>
        )}

        {activeTab === 'daily' && teachers.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button onClick={handleSave} disabled={loading} className={`flex items-center px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
              {loading ? 'Saving...' : 'Save All Records'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAttendance;
