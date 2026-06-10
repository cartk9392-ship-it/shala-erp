import React, { useState, useEffect } from 'react';
import { Search, Edit2, UserPlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocumentsWhere, addDocument, updateDocument, deleteDocument, subscribeToCollectionWhere, COLLECTIONS } from '../../api/apiService';

const initialFormState = {
  // Personal Details
  name: '', dob: '', placeOfBirth: '', gender: 'Male', bloodGroup: '', religion: '', aadharNo: '', motherTongue: '',
  // Academic Details
  rollNo: '', admissionNo: '', admissionDate: '', previousSchool: '',
  // Parent Details
  parentName: '', fatherOccupation: '', motherName: '', motherOccupation: '', parentPhone: '', alternatePhone: '', email: '',
  // Residential & Medical
  address: '', medicalConditions: ''
};

const FormSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
      >
        {title}
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const ManageStudents = () => {
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingStudentId, setEditingStudentId] = useState(null);

  useEffect(() => {
    const myClass = userData?.classAssigned?.trim();
    if (!myClass) return;

    const unsubscribe = subscribeToCollectionWhere(
      COLLECTIONS.STUDENTS, 
      'class', 
      '==', 
      myClass, 
      (studs) => {
        setStudents(studs);
      }
    );

    return () => unsubscribe();
  }, [userData?.classAssigned]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const myClass = userData?.classAssigned?.trim();
    try {
      if (editingStudentId) {
        await updateDocument(COLLECTIONS.STUDENTS, editingStudentId, formData);
        setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, ...formData } : s));
        alert('Student record updated successfully!');
      } else {
        const newStudent = await addDocument(COLLECTIONS.STUDENTS, { ...formData, class: myClass });
        setStudents(prev => [...prev, newStudent]);
        alert('Student record added successfully!');
      }
      setFormData(initialFormState);
      setEditingStudentId(null);
      setShowForm(false);
    } catch (e) { console.error(e); alert('Error saving student.'); }
  };

  const handleEditClick = (student) => {
    // Fill form with student details, use fallback for missing fields
    const filledState = {};
    Object.keys(initialFormState).forEach(key => {
      filledState[key] = student[key] || '';
    });
    // Handle gender fallback specifically since it's a select
    filledState.gender = student.gender || 'Male';

    setFormData(filledState);
    setEditingStudentId(student.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this student record?')) {
      try {
        await deleteDocument(COLLECTIONS.STUDENTS, id);
        setStudents(prev => prev.filter(s => s.id !== id));
      } catch (e) { console.error(e); }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!userData?.classAssigned) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Class Assigned</h2>
        <p className="text-slate-500 text-center max-w-md">
          You haven't been assigned a class yet. Please ask the School Administrator to assign you a class before you can manage students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Students ({userData.classAssigned})</h1>
          <p className="text-slate-500">Manage comprehensive student records for your class</p>
        </div>
        <button 
          onClick={() => {
            setFormData(initialFormState);
            setEditingStudentId(null);
            setShowForm(!showForm);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center shadow-md"
        >
          <UserPlus className="w-4 h-4 mr-2" /> {showForm && !editingStudentId ? 'Close Form' : 'Add Student'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
              {editingStudentId ? 'Edit Student Details' : 'Comprehensive Admission Form'}
            </h2>
            <p className="text-sm text-slate-500">Fields marked with * are required.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <FormSection title="1. Personal Details" defaultOpen={true}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none bg-white">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Place of Birth</label>
                <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none bg-white">
                  <option value="">Select</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Religion / Caste Category</label>
                <input type="text" name="religion" placeholder="e.g. Hindu / General" value={formData.religion} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Number</label>
                <input type="text" name="aadharNo" placeholder="12-digit Aadhar" value={formData.aadharNo} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mother Tongue</label>
                <input type="text" name="motherTongue" value={formData.motherTongue} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </FormSection>

            <FormSection title="2. Academic Details" defaultOpen={true}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number *</label>
                <input type="text" name="rollNo" required value={formData.rollNo} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 101 or TS-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
                <input type="text" name="admissionNo" value={formData.admissionNo} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Admission</label>
                <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Previous School Attended</label>
                <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </FormSection>

            <FormSection title="3. Parent / Guardian Details" defaultOpen={true}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Father's / Guardian Name *</label>
                <input type="text" name="parentName" required value={formData.parentName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Father's Occupation</label>
                <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mother's Name</label>
                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mother's Occupation</label>
                <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Contact Number *</label>
                <input type="tel" name="parentPhone" required value={formData.parentPhone} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alternate / Emergency Number</label>
                <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </FormSection>

            <FormSection title="4. Residential & Medical Details" defaultOpen={true}>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Residential Address</label>
                <textarea rows="2" name="address" value={formData.address} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none"></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Medical Conditions / Allergies (If Any)</label>
                <textarea rows="2" name="medicalConditions" placeholder="Optional. Describe any medical alerts." value={formData.medicalConditions} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none"></textarea>
              </div>
            </FormSection>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => { setShowForm(false); setEditingStudentId(null); }} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium shadow-sm">{editingStudentId ? 'Update Student Record' : 'Save Student Record'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Roll No</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Parent/Guardian</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500">Contact</th>
                <th className="px-6 py-3 text-sm font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{student.rollNo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.parentName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.parentPhone || 'N/A'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEditClick(student)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" onClick={() => handleDelete(student.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No students added yet in this class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageStudents;
