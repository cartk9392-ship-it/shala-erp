import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDocuments, getDocument, loginUser, COLLECTIONS, updateDocument } from '../api/apiService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const updateUnreadCount = useCallback(async () => {
    if (!userData || userData.role === 'admin') return;
    try {
      const notices = await getDocuments(COLLECTIONS.NOTICES);
      const lastRead = userData.lastReadNoticeTime || 0;
      
      const unread = notices.filter(n => {
        const isTargeted = n.target === 'All' || 
                          (userData.role === 'teacher' && n.target === 'Teachers') ||
                          (userData.role === 'parent' && n.target === 'Parents');
        // Handle both shim object {seconds: ...} and plain date string
        let noticeTime = 0;
        if (n.createdAt) {
          if (typeof n.createdAt === 'object' && n.createdAt.seconds) {
            noticeTime = n.createdAt.seconds * 1000;
          } else if (n.timestamp) {
            noticeTime = n.timestamp;
          } else {
            noticeTime = new Date(n.createdAt).getTime();
          }
        }
        return isTargeted && noticeTime > lastRead;
      });
      
      setUnreadNoticeCount(unread.length);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  }, [userData]);

  // Poll for new notices every 15 seconds
  useEffect(() => {
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [updateUnreadCount]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('mockSession');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      // Fetch fresh data from server to ensure it's not stale
      getDocument(COLLECTIONS.USERS, session._id || session.id)
        .then(freshData => {
          if (freshData) {
            console.log('Session refreshed successfully');
            const sessionData = { ...freshData, token: session.token };
            setCurrentUser({ uid: freshData.id, email: `${freshData.username}@schoolerp.com` });
            setUserData(sessionData);
            localStorage.setItem('mockSession', JSON.stringify(sessionData));
          } else {
            console.warn('Session refresh returned no data, using local session');
            setCurrentUser({ uid: session._id || session.id, email: `${session.username}@schoolerp.com` });
            setUserData(session);
          }
        })
        .catch(err => {
          console.error('Error refreshing session:', err);
          // Fallback to stale local data if server is down or 401 occurs temporarily
          if (session && (session._id || session.id)) {
            setCurrentUser({ uid: session._id || session.id, email: `${session.username}@schoolerp.com` });
            setUserData(session);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const data = await loginUser(username, password);
      const sessionData = { 
        ...data,
        uid: data._id 
      };
      localStorage.setItem('mockSession', JSON.stringify(sessionData));
      setCurrentUser({ uid: sessionData._id, email: `${username}@schoolerp.com` });
      setUserData(sessionData);
      return Promise.resolve();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('mockSession');
    setCurrentUser(null);
    setUserData(null);
    return Promise.resolve();
  };

  const markNoticesAsRead = useCallback(async () => {
    setUserData(prev => {
      if (!prev) return prev;
      
      const now = Date.now();
      // Safety throttle: Only update if it's been more than 2 seconds since last update
      if (prev.lastReadNoticeTime && (now - prev.lastReadNoticeTime < 2000)) return prev;

      const updatedUserData = { ...prev, lastReadNoticeTime: now };
      
      // Update local storage
      localStorage.setItem('mockSession', JSON.stringify(updatedUserData));
      
      // Async update to DB
      if (prev.id || prev._id) {
        updateDocument(COLLECTIONS.USERS, prev.id || prev._id, { lastReadNoticeTime: now })
          .catch(error => console.error('Error updating notice read time:', error));
      }
      
      return updatedUserData;
    });
    setUnreadNoticeCount(0);
  }, []);

  const updateLocalUserData = (newUserData) => {
    setUserData(prev => {
      const updated = { ...prev, ...newUserData };
      localStorage.setItem('mockSession', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    currentUser,
    userData,
    login,
    logout,
    unreadNoticeCount,
    markNoticesAsRead,
    updateUnreadCount,
    updateLocalUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
