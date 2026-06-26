import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { getDocuments, getDocumentsWhere, addDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';
import { useDialog } from '../../context/DialogContext';

const ManageClasses = () => {
  const { showToast, showConfirm } = useDialog();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', classTeacher: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cls, users, studs] = await Promise.all([
          getDocuments(COLLECTIONS.CLASSES),
          getDocumentsWhere(COLLECTIONS.USERS, 'role', '==', 'teacher'),
          getDocuments(COLLECTIONS.STUDENTS)
        ]);
        setClasses(cls); setTeachers(users); setStudents(studs);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  const getStudentCount = (cn) => students.filter(s => s.class === cn).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newDoc = await addDocument(COLLECTIONS.CLASSES, newClass);
      setClasses(p => [...p, newDoc]);
      if (newClass.classTeacher) {
        const t = teachers.find(t => t.name === newClass.classTeacher);
        if (t) await updateDocument(COLLECTIONS.USERS, t.id, { classAssigned: newClass.name });
      }
      setNewClass({ name: '', classTeacher: '' }); setShowForm(false);
      showToast('Class created successfully!', 'success');
    } catch (e) { console.error(e); showToast('Error creating class.', 'error'); }
  };

  const handleDelete = async (id, cn) => {
    const ok = await showConfirm({
      title: `Delete Class ${cn}?`,
      message: `Are you sure you want to delete Class "${cn}"? This will also remove student assignments for this class.`,
      confirmText: 'Yes, Delete Class',
      danger: true
    });
    if (!ok) return;

    try {
      await deleteDocument(COLLECTIONS.CLASSES, id);
      setClasses(p => p.filter(c => c.id !== id));
      setStudents(p => p.filter(s => s.class !== cn));
      showToast(`Class "${cn}" deleted successfully.`, 'success');
    } catch (e) { 
      console.error(e); 
      showToast('Error deleting class: ' + (e.response?.data?.message || e.message), 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manage Classes</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center"><Plus className="w-4 h-4 mr-2" /> Create Class</button>
      </div>
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Create New Class</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label><input type="text" required placeholder="e.g. 8th C" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Class Teacher</label><select value={newClass.classTeacher} onChange={e => setNewClass({...newClass, classTeacher: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none bg-white"><option value="">No Teacher</option>{teachers.map(t => <option key={t.id} value={t.name}>{t.name} ({t.subject})</option>)}</select></div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">Create</button>
            </div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
            <button 
              onClick={() => handleDelete(cls.id, cls.name)} 
              className="absolute top-4 right-4 p-2 rounded-lg transition-all text-red-500 md:text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mb-4">{cls.name.split(' ')[0]}</div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Class {cls.name}</h3>
            <p className="text-sm text-slate-500 mb-4">Teacher: {cls.classTeacher || 'Not assigned'}</p>
            <div className="flex items-center text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg"><Users className="w-5 h-5 text-slate-400 mr-2" />{getStudentCount(cls.name)} Students</div>
          </div>
        ))}
        {classes.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">No classes yet.</div>}
      </div>
    </div>
  );
};

export default ManageClasses;
