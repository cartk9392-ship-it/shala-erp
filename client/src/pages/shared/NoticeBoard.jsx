import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Calendar, Info } from 'lucide-react';
import { getDocuments, COLLECTIONS } from '../../api/apiService';

const NoticeBoard = () => {
  const [notices, setNotices] = useState([]);
  const { userData, markNoticesAsRead } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedNotices = await getDocuments(COLLECTIONS.NOTICES);
        const filtered = storedNotices.filter(n => {
          if (n.target === 'All') return true;
          if (userData?.role === 'teacher' && n.target === 'Teachers') return true;
          if (userData?.role === 'parent' && n.target === 'Parents') return true;
          return false;
        });
        setNotices(filtered);
      } catch (error) {
        console.error('Error loading notices:', error);
      }
    };
    loadData();
  }, [userData]);

  useEffect(() => {
    // Mark as read when page is viewed
    markNoticesAsRead();
  }, [markNoticesAsRead]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notice Board</h1>
          <p className="text-slate-500 mt-1">Stay updated with the latest school announcements.</p>
        </div>
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
          <Bell className="w-6 h-6" />
        </div>
      </div>

      <div className="grid gap-4">
        {notices.length > 0 ? (
          notices.map((notice) => (
            <div key={notice.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  <Info className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{notice.title}</h3>
                    <div className="flex items-center text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {notice.date}
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No Notices Yet</h3>
            <p className="text-slate-500">When the administration posts a notice, it will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeBoard;
