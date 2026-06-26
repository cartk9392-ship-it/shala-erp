import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';
import { getDocuments, getDocumentsWhere, addDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';
import { useDialog } from '../../context/DialogContext';

const ManageTeachers = () => {
  const { showToast, showConfirm } = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', subject: '', classAssigned: '' });
  const [loading, setLoading] = useState(true);

  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        const users = await getDocumentsWhere(COLLECTIONS.USERS, 'role', '==', 'teacher');
        setTeachers(users);
        const cls = await getDocuments(COLLECTIONS.CLASSES);
        setClasses(cls);
      } catch (error) {
        console.error('Error loading teachers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDocument(COLLECTIONS.USERS, editingId, formData);
        setTeachers(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } : t));
      } else {
        const newTeacher = await addDocument(COLLECTIONS.USERS, { ...formData, role: 'teacher' });
        setTeachers(prev => [...prev, newTeacher]);
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving teacher:', error);
      showToast('Error saving teacher. Please try again.', 'error');
    }
  };
 
  const handleEdit = (teacher) => {
    setFormData({
      name: teacher.name,
      username: teacher.username,
      password: teacher.password || '', // Display the stored plain text password
      subject: teacher.subject,
      classAssigned: teacher.classAssigned || ''
    });
    setEditingId(teacher.id);
    setShowForm(true);
  };
 
  const handleCancel = () => {
    setFormData({ name: '', username: '', password: '', subject: '', classAssigned: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id, name) => {
    const ok = await showConfirm({
      title: 'Delete Teacher?',
      message: `Are you sure you want to remove "${name}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDocument(COLLECTIONS.USERS, id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      showToast('Teacher account removed successfully.', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Manage Teachers</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Create and manage teacher accounts</p>
        </div>
        <button onClick={() => { if (showForm && editingId) handleCancel(); setShowForm(!showForm); }} className="premium-button flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> <span>{showForm ? 'Close Form' : 'Add Teacher'}</span>
        </button>
      </div>

      {showForm && (
        <div className="premium-card animate-in border border-primary/10">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            {editingId ? 'Edit Teacher Details' : 'Add New Teacher & Create Login'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all text-sm" placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Subject</label>
              <input type="text" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all text-sm" placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Login Username</label>
              <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all text-sm" placeholder="e.g. john_teacher" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Login Password
              </label>
              <input 
                type="text" 
                required
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all text-sm" 
                placeholder="Set password" 
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Assign Class (Optional)</label>
              <select value={formData.classAssigned} onChange={e => setFormData({...formData, classAssigned: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all appearance-none cursor-pointer text-sm">
                <option value="">Not Assigned</option>
                {classes.map(c => <option key={c.id} value={c.name}>Class {c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-2">
              <button type="button" onClick={handleCancel} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium order-2 sm:order-1">Cancel</button>
              <button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 order-1 sm:order-2">{editingId ? 'Update Teacher' : 'Save Teacher'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="premium-card p-0 overflow-hidden border border-slate-100">
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 md:w-5 md:h-5 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search teachers..." className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-xs md:text-sm font-medium" />
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>{teachers.length} Active
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {teachers.map(teacher => (
            <div key={teacher.id} className="p-4 hover:bg-primary/5 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{teacher.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{teacher.name}</p>
                    <p className="text-xs text-slate-500">{teacher.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(teacher)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button 
                    onClick={() => handleDelete(teacher.id, teacher.name)} 
                    className="p-2 rounded-lg transition-all text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 rounded-lg px-2.5 py-1">@{teacher.username}</span>
                {teacher.classAssigned ? <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Class {teacher.classAssigned}</span> : <span className="text-slate-400 text-[10px] italic bg-slate-50 px-2.5 py-1 rounded-lg">Not assigned</span>}
              </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Users className="w-7 h-7 text-slate-300" /></div>
              <p className="text-slate-400 font-medium text-sm">No teachers found</p>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Username</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Class</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{teacher.name.charAt(0)}</div><span className="text-sm font-bold text-slate-800">{teacher.name}</span></div></td>
                  <td className="px-6 py-4"><span className="text-xs font-mono font-bold text-primary bg-primary/5 rounded-lg px-3 py-1.5">{teacher.username}</span></td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{teacher.subject}</td>
                  <td className="px-6 py-4">{teacher.classAssigned ? <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{teacher.classAssigned}</span> : <span className="text-slate-400 text-[10px] italic">Not assigned</span>}</td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEdit(teacher)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button 
                      onClick={() => handleDelete(teacher.id, teacher.name)} 
                      className="p-2 rounded-xl transition-all text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div></td>
                </tr>
              ))}
              {teachers.length === 0 && <tr><td colSpan="5" className="px-6 py-12 text-center"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-slate-300" /></div><p className="text-slate-400 font-medium">No teachers found.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageTeachers;
