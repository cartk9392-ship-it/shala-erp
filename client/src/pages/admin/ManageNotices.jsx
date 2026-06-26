import React, { useState, useEffect } from 'react';
import { Send, Bell, Trash2 } from 'lucide-react';
import { getDocuments, addDocument, deleteDocument, COLLECTIONS } from '../../api/apiService';
import { useDialog } from '../../context/DialogContext';

const ManageNotices = () => {
  const { showToast, showConfirm } = useDialog();
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', target: 'All' });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const data = await getDocuments(COLLECTIONS.NOTICES);
        data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotices(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadNotices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const noticeData = {
        ...newNotice,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString()
      };
      const newDoc = await addDocument(COLLECTIONS.NOTICES, noticeData);
      setNotices(prev => [newDoc, ...prev]);
      setNewNotice({ title: '', content: '', target: 'All' });
      showToast('Notice sent successfully! 📢', 'success');
    } catch (e) { console.error(e); showToast('Error sending notice.', 'error'); }
  };

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Delete Notice?',
      message: 'This notice will be permanently removed.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDocument(COLLECTIONS.NOTICES, id);
      setNotices(prev => prev.filter(n => n.id !== id));
      showToast('Notice deleted.', 'success');
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">School Notices & Announcements</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold mb-4">Send New Notice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notice Title</label>
              <input type="text" required value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Annual Sports Meet" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <select value={newNotice.target} onChange={e => setNewNotice({...newNotice, target: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50 bg-white">
                <option value="All">All Parents & Teachers</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Parents">Parents Only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notice Content</label>
            <textarea required rows="4" value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/50" placeholder="Type your announcement here..."></textarea>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center transition">
              <Send className="w-4 h-4 mr-2" /> Send Notice
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Past Notices</h2>
        {notices.map(notice => (
          <div key={notice.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start group">
            <div className="flex space-x-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-bold text-slate-800">{notice.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">{notice.target}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{notice.content}</p>
                <p className="text-xs text-slate-400">{notice.date}</p>
              </div>
            </div>
            <button onClick={() => handleDelete(notice.id)} className="p-2 text-red-500 md:text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {notices.length === 0 && (
          <p className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-100">No notices sent yet.</p>
        )}
      </div>
    </div>
  );
};

export default ManageNotices;
