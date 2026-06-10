import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Award, ShieldCheck, Heart, Hash, Map, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, COLLECTIONS } from '../../api/apiService';

const ChildProfile = () => {
  const { userData } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    const loadChildData = async () => {
      if (!userData?.studentId) return;
      try {
        const myChild = await getDocument(COLLECTIONS.STUDENTS, userData.studentId.toString());
        setStudentInfo(myChild);
      } catch (error) {
        console.error('Error loading child profile:', error);
      }
    };
    loadChildData();
    const interval = setInterval(loadChildData, 30000); // Poll every 30s (profile rarely changes)
    return () => clearInterval(interval);
  }, [userData]);

  if (!studentInfo) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <User className="w-10 h-10 text-slate-300" />
        </div>
        <p className="font-bold text-lg text-slate-400">Child data is being prepared...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Premium Header Card */}
      <div className="relative bg-white rounded-[2rem] shadow-xl shadow-blue-500/5 border border-slate-100 overflow-hidden">
        {/* Animated Background Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        {/* Top Gradient Bar */}
        <div className="h-48 bg-gradient-to-r from-slate-900 via-slate-800 to-primary relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>

        <div className="px-8 pb-10">
          <div className="relative flex flex-col md:flex-row items-center md:items-end -mt-20 gap-6">
            {/* Avatar Container */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-40 h-40 bg-white rounded-3xl shadow-2xl p-1.5 border border-white/50 backdrop-blur-sm overflow-hidden">
                <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 relative overflow-hidden">
                    <User className="w-20 h-20" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary"></div>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Name & Title */}
            <div className="flex-1 text-center md:text-left pt-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">{studentInfo.name}</h1>
                <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-md tracking-widest shadow-sm shadow-primary/20">ACTIVE</span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 font-bold">
                <span className="flex items-center text-sm uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 mr-2 text-primary" /> Class {studentInfo.class} - Section A
                </span>
                <span className="hidden md:block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                <span className="flex items-center text-sm uppercase tracking-wider">
                  <Hash className="w-4 h-4 mr-2 text-slate-400" /> Roll No: {studentInfo.rollNo}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 hover:text-primary hover:bg-primary/5 transition-all shadow-sm">
                    <Heart className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-8">
        
        {/* Essential Info Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center">
            <span className="w-8 h-px bg-slate-200 mr-3"></span> Student Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
            <InfoItem icon={<User className="text-blue-500"/>} label="Father's Name" value={studentInfo.parentName || 'N/A'} />
            <InfoItem icon={<Calendar className="text-amber-500"/>} label="Date of Birth" value="15 Aug 2012" />
            <InfoItem icon={<Phone className="text-emerald-500"/>} label="Primary Contact" value="+91 98765 43210" />
            <InfoItem icon={<Mail className="text-purple-500"/>} label="Email Address" value="student@shalaerp.com" />
            <InfoItem icon={<Map className="text-rose-500"/>} label="Blood Group" value="O+ Positive" />
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center">
            <span className="w-8 h-px bg-slate-200 mr-3"></span> Home Address
          </h2>
          <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-lg font-bold text-slate-800 leading-snug max-w-2xl">
                      123, Education Square, Sector 4, Behind Knowledge Park, Mumbai, Maharashtra - 400001
                  </p>
                  <p className="text-sm text-slate-400 font-bold mt-2 uppercase tracking-wider">Permanent Residence</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Info Items
const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-base font-black text-slate-800 leading-none">{value}</p>
    </div>
  </div>
);

const AlertCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default ChildProfile;
