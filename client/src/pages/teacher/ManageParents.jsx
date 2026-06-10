import React, { useState, useEffect } from 'react';
import { UserPlus, Key, Trash2, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocuments, getDocumentsWhere, addDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';

const ManageParents = () => {
  const { userData } = useAuth();
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', studentId: '', username: '', password: '' });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const myClass = userData?.classAssigned;
      if (!myClass) return;
      try {
        const [allUsers, myClassStudents] = await Promise.all([
          getDocuments(COLLECTIONS.USERS),
          getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', myClass)
        ]);

        // Get student IDs for this class
        const studentIds = myClassStudents.map(s => (s.id || s._id)?.toString());

        // Show parents linked to this class — by class field OR by studentId match
        const parentUsers = allUsers.filter(u =>
          u.role === 'parent' && (
            u.class === myClass ||
            studentIds.includes(u.studentId?.toString())
          )
        );

        setParents(parentUsers);
        setStudents(myClassStudents);
      } catch (error) {
        console.error('Error loading parent data:', error);
      }
    };
    loadData();
  }, [userData?.classAssigned]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedStudent = students.find(s => s.id.toString() === formData.studentId);
    if (!selectedStudent) { alert('Please select a student.'); return; }
    try {
      const newParent = {
        ...formData,
        studentName: selectedStudent.name,
        studentId: selectedStudent.id,
        role: 'parent',
        class: userData?.classAssigned
      };
      const savedParent = await addDocument(COLLECTIONS.USERS, newParent);
      setParents(prev => [...prev, savedParent]);
      setFormData({ name: '', studentId: '', username: '', password: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating parent account:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(COLLECTIONS.USERS, id);
      setParents(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting parent account:', error);
      alert('Delete failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parent Accounts</h1>
          <p className="text-slate-500">Create parent logins for your students</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center shadow-md"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Create Parent Login
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-semibold mb-4">Generate Parent Credentials</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" 
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link to Student</label>
              <select 
                required 
                value={formData.studentId} 
                onChange={e => setFormData({...formData, studentId: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none bg-white"
              >
                <option value="">Select a student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo})</option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Please add students first in "My Students".</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign Username</label>
              <input 
                type="text" 
                required 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" 
                placeholder="e.g. ramesh_123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign Password</label>
              <input 
                type="text" 
                required 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" 
                placeholder="Set password"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center transition shadow-sm">
                <Key className="w-4 h-4 mr-2" /> Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Linked Child</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Login Username</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Login Password</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parents.map(parent => (
                <tr key={parent.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    {parent.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{parent.studentName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-primary font-bold">
                    <span className="bg-primary/5 px-2 py-1 rounded">{parent.username}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded">{parent.password}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" 
                      onClick={() => handleDelete(parent.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {parents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No parent accounts created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageParents;
