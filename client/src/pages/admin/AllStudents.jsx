import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, X, User, Phone, MapPin, Calendar, CreditCard, Droplet, Heart, BookOpen, Users, Building } from 'lucide-react';
import { getDocuments, COLLECTIONS } from '../../api/apiService';

const AllStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studs, cls] = await Promise.all([
          getDocuments(COLLECTIONS.STUDENTS),
          getDocuments(COLLECTIONS.CLASSES)
        ]);
        setStudents(studs);
        setAvailableClasses(cls);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.class && s.class.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = selectedClass === 'All' || s.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col">
      <div className="flex items-center text-slate-500 mb-1.5 text-sm">
        <Icon className="w-4 h-4 mr-2 text-slate-400" /> {label}
      </div>
      <p className="font-semibold text-slate-800">{value || <span className="text-slate-400 font-normal italic">Not provided</span>}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">All Students Directory</h1>
        <p className="text-slate-500 mt-1">View and search across all registered students in the school.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary" 
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-4 py-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition w-full sm:w-auto outline-none"
            >
              <option value="All">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Roll No</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Class</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Parent Name</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500 text-right">View Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{student.rollNo}</td>
                   <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">{student.class || 'Not Assigned'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.parentName}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setViewingStudent(student)}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1.5" /> Full Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Student Profile Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <User className="w-6 h-6 mr-2 text-primary" />
                Comprehensive Student Profile
              </h2>
              <button 
                onClick={() => setViewingStudent(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6 mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm">
                  {viewingStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">{viewingStudent.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                      Class: {viewingStudent.class || 'N/A'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                      Roll No: {viewingStudent.rollNo || 'N/A'}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                      Gender: {viewingStudent.gender || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-8">
                
                {/* 1. Personal Details */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                    <User className="w-5 h-5 mr-2 text-slate-400" /> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem icon={Calendar} label="Date of Birth" value={viewingStudent.dob} />
                    <InfoItem icon={MapPin} label="Place of Birth" value={viewingStudent.placeOfBirth} />
                    <InfoItem icon={Droplet} label="Blood Group" value={viewingStudent.bloodGroup} />
                    <InfoItem icon={Users} label="Religion & Caste" value={viewingStudent.religion} />
                    <InfoItem icon={CreditCard} label="Aadhar Number" value={viewingStudent.aadharNo} />
                    <InfoItem icon={User} label="Mother Tongue" value={viewingStudent.motherTongue} />
                  </div>
                </div>

                {/* 2. Academic Details */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                    <BookOpen className="w-5 h-5 mr-2 text-slate-400" /> Academic Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem icon={CreditCard} label="Admission Number" value={viewingStudent.admissionNo} />
                    <InfoItem icon={Calendar} label="Date of Admission" value={viewingStudent.admissionDate} />
                    <InfoItem icon={Building} label="Previous School" value={viewingStudent.previousSchool} />
                  </div>
                </div>

                {/* 3. Parent Details */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                    <Users className="w-5 h-5 mr-2 text-slate-400" /> Parent / Guardian Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem icon={User} label="Father/Guardian Name" value={viewingStudent.parentName} />
                    <InfoItem icon={Building} label="Father's Occupation" value={viewingStudent.fatherOccupation} />
                    <InfoItem icon={Phone} label="Primary Contact" value={viewingStudent.parentPhone} />
                    <InfoItem icon={User} label="Mother's Name" value={viewingStudent.motherName} />
                    <InfoItem icon={Building} label="Mother's Occupation" value={viewingStudent.motherOccupation} />
                    <InfoItem icon={Phone} label="Alternate Contact" value={viewingStudent.alternatePhone} />
                  </div>
                </div>

                {/* 4. Address & Medical */}
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                    <Heart className="w-5 h-5 mr-2 text-slate-400" /> Residential & Medical
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center text-slate-500 mb-1.5 text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Full Residential Address
                      </div>
                      <p className="font-semibold text-slate-800">{viewingStudent.address || <span className="text-slate-400 font-normal italic">Not provided</span>}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center text-slate-500 mb-1.5 text-sm">
                        <Heart className="w-4 h-4 mr-2 text-slate-400" /> Medical Conditions / Allergies
                      </div>
                      <p className="font-semibold text-slate-800">{viewingStudent.medicalConditions || <span className="text-slate-400 font-normal italic">None reported</span>}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setViewingStudent(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllStudents;
