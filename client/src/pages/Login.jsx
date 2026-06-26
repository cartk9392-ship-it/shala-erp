import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useDialog();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      showToast('Welcome back! Logging in...', 'success');
      navigate('/'); 
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      showToast('Login Failed: Invalid credentials.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] md:w-[800px] h-[500px] md:h-[800px] bg-primary/20 rounded-full blur-[100px] md:blur-[150px] -translate-y-1/2 translate-x-1/3 animate-pulse-soft"></div>
      <div className="absolute bottom-0 left-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
      
      <div className="w-full max-w-md relative z-10 animate-in">
        {/* Logo Section */}
        <div className="text-center mb-8 md:mb-10">
          <div className="mx-auto bg-gradient-to-tr from-primary to-blue-400 w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-2xl shadow-primary/40 rotate-3 transition-transform hover:rotate-0">
            <GraduationCap className="text-white w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-2">
            Shala<span className="text-primary">ERP</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs md:text-sm">Modern Education Management System</p>
        </div>

        {/* Login Card */}
        <div className="glass-dark p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-primary/10 rounded-full blur-3xl -mr-16 md:-mr-24 -mt-16 md:-mt-24 transition-transform group-hover:scale-150 duration-700"></div>
          
          <div className="relative z-10">
            <div className="mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h2>
              <p className="text-slate-500 font-medium text-xs md:text-sm">Please enter your credentials to continue</p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm mb-6 border border-red-500/20 flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-red-400"></div>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-slate-500">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-slate-600 text-sm md:text-base"
                    placeholder="Username"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-slate-500">
                    <Lock className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-slate-600 text-sm md:text-base"
                    placeholder="Password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-blue-500 text-white font-bold py-3 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 shadow-xl shadow-primary/20 flex items-center justify-center mt-4 disabled:opacity-50 active:scale-95 text-sm md:text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : 'Sign In to Dashboard'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-[10px] md:text-xs font-medium">
            &copy; 2026 Shala ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
