import React, { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Calendar, CheckCircle, XCircle, Clock, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocumentsWhere, getDocuments, addDocument, updateDocument, deleteDocument, getDocument, setDocument, COLLECTIONS } from '../../api/apiService';

const Homework = () => {
  const { userData } = useAuth();
  const [homeworkList, setHomeworkList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ subject: '', title: '', dueDate: '' });
  const [subjectHistory, setSubjectHistory] = useState(['Mathematics', 'Science', 'English', 'History', 'Geography']);
  
  // Tracking State
  const [checkingHomework, setCheckingHomework] = useState(null);
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const myClass = userData?.classAssigned;
        if (!myClass) return;
        const hw = await getDocumentsWhere(COLLECTIONS.HOMEWORK, 'class', '==', myClass);
        hw.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setHomeworkList(hw);
        const uniqueSubjects = [...new Set(hw.map(h => h.subject))];
        if (uniqueSubjects.length > 0) setSubjectHistory(prev => [...new Set([...prev, ...uniqueSubjects])]);
        const studs = await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass);
        setStudents(studs);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, [userData?.classAssigned]);

  useEffect(() => {
    if (checkingHomework) {
      const loadStatus = async () => {
        try {
          const statusDoc = await getDocument('homework_status', checkingHomework.id);
          setStatusMap(statusDoc?.statuses || {});
        } catch (e) { setStatusMap({}); }
      };
      loadStatus();
    }
  }, [checkingHomework]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const today = new Date().toISOString().split('T')[0];
      const docId = `${userData?.classAssigned}_${formData.subject}_${today}`.replace(/\s+/g, '_');
      const newHomework = { 
        ...formData, 
        class: userData?.classAssigned, 
        dateAssigned: today, 
        timestamp: Date.now() 
      };
      
      const savedDoc = await updateDocument(COLLECTIONS.HOMEWORK, docId, newHomework);
      
      setHomeworkList(prev => {
        const filtered = prev.filter(h => h.id !== docId);
        return [savedDoc, ...filtered];
      });
      
      setFormData({ subject: '', title: '', dueDate: '' });
      setShowForm(false);
    } catch (e) { console.error(e); alert('Error saving homework.'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(COLLECTIONS.HOMEWORK, id);
      setHomeworkList(prev => prev.filter(h => h.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = (studentId, status) => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
  };

  const saveStatus = async () => {
    try {
      await setDocument('homework_status', checkingHomework.id, { statuses: statusMap });
      alert('Homework status updated successfully!');
      setCheckingHomework(null);
    } catch (e) { console.error(e); alert('Error saving status.'); }
  };

  if (checkingHomework) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setCheckingHomework(null)}
              className="mr-4 p-2 hover:bg-slate-100 rounded-full transition text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Check Homework</h1>
              <p className="text-slate-500">{checkingHomework.subject}: {checkingHomework.title}</p>
            </div>
          </div>
          <button 
            onClick={saveStatus}
            className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-primary/90 transition flex items-center shadow-md"
          >
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Roll No</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-800">{student.rollNo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleStatusChange(student.id, 'Completed')}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          statusMap[student.id] === 'Completed' 
                            ? 'bg-green-100 text-green-700 border-2 border-green-200' 
                            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completed
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, 'Pending')}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          statusMap[student.id] === 'Pending' 
                            ? 'bg-amber-100 text-amber-700 border-2 border-amber-200' 
                            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                      </button>
                      <button 
                        onClick={() => handleStatusChange(student.id, 'Not Submitted')}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          statusMap[student.id] === 'Not Submitted' 
                            ? 'bg-red-100 text-red-700 border-2 border-red-200' 
                            : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Not Submitted
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No students found in this class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Homework Management</h1>
          <p className="text-slate-500">Assign and track homework for your class</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Assign Homework
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-semibold mb-4">New Homework Assignment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject (Type or Select)</label>
                <input 
                  type="text"
                  required 
                  list="hw-subject-history"
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  placeholder="e.g. Science"
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                />
                <datalist id="hw-subject-history">
                  {subjectHistory.map((sub, i) => <option key={i} value={sub} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Task Description / Title</label>
              <textarea required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} rows="3" className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Enter detailed homework instructions..."></textarea>
            </div>
            <div className="flex justify-end space-x-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm">Assign to Class</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {homeworkList.map(hw => (
          <div key={hw.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center group hover:border-primary/20 transition">
            <div className="flex items-start mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md mb-2">{hw.subject}</span>
                <h3 className="text-lg font-bold text-slate-800">{hw.title}</h3>
                <div className="flex items-center text-sm text-slate-500 mt-2 space-x-4">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> Assigned: {hw.dateAssigned}</span>
                  <span className="flex items-center text-amber-600"><Calendar className="w-4 h-4 mr-1" /> Due: {hw.dueDate}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setCheckingHomework(hw)}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition flex items-center text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Check Homework
              </button>
              <button 
                onClick={() => handleDelete(hw.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {homeworkList.length === 0 && (
          <div className="text-center p-12 text-slate-500 bg-white rounded-xl border border-slate-100">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p>No homework assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homework;
