import React, { useState, useEffect } from 'react';
import { Save, Building, Mail, Phone, MapPin, Key, User, Lock } from 'lucide-react';
import { getDocument, updateDocument, COLLECTIONS } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { userData, updateLocalUserData } = useAuth();
  const [settings, setSettings] = useState({
    schoolName: 'Shala ERP School',
    schoolEmail: 'admin@shalaerp.com',
    schoolPhone: '+91 98765 43210',
    schoolAddress: '123 Education Lane, Knowledge City'
  });

  const [credentials, setCredentials] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getDocument(COLLECTIONS.SETTINGS, 'school_profile');
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (userData) {
      setCredentials(prev => ({
        ...prev,
        name: userData.name || '',
        username: userData.username || ''
      }));
    }
  }, [userData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Password validation
    if (credentials.password) {
      if (credentials.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (credentials.password !== credentials.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Save school settings
      await updateDocument(COLLECTIONS.SETTINGS, 'school_profile', settings);

      // 2. Save credentials if changed
      if (userData) {
        const adminId = userData._id || userData.id;
        const updatePayload = { 
          name: credentials.name.trim(),
          username: credentials.username.trim() 
        };
        if (credentials.password) {
          updatePayload.password = credentials.password;
        }
        await updateDocument(COLLECTIONS.USERS, adminId, updatePayload);
        updateLocalUserData(updatePayload);
      }

      setSuccess('Settings and Admin Credentials updated successfully!');
      setCredentials(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error.message || 'Error updating settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
          <p className="text-slate-500 mt-1">Configure your school environment and profile.</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center animate-fade-in">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center animate-fade-in">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3 animate-pulse"></div>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* School Profile */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">School Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">School Name</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={settings.schoolName}
                  onChange={e => setSettings({...settings, schoolName: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="email" 
                  value={settings.schoolEmail}
                  onChange={e => setSettings({...settings, schoolEmail: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={settings.schoolPhone}
                  onChange={e => setSettings({...settings, schoolPhone: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={settings.schoolAddress}
                  onChange={e => setSettings({...settings, schoolAddress: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Credentials */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Change Admin Credentials</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={credentials.name}
                  onChange={e => setCredentials({...credentials, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  placeholder="Display Name (e.g. Ganesh)"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Admin Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={credentials.username}
                  onChange={e => setCredentials({...credentials, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  placeholder="Username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="password" 
                  value={credentials.password}
                  onChange={e => setCredentials({...credentials, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="password" 
                  value={credentials.confirmPassword}
                  onChange={e => setCredentials({...credentials, confirmPassword: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className={`flex items-center px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
