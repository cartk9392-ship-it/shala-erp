import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, IndianRupee, Plus, X, FileText, CheckCircle, AlertCircle, Settings, Download } from 'lucide-react';
import { getDocuments, getDocument, addDocument, updateDocument, COLLECTIONS } from '../../api/apiService';
import { useDialog } from '../../context/DialogContext';

const ManageFees = () => {
  const { showToast } = useDialog();
  const [activeTab, setActiveTab] = useState('collection'); // 'collection' or 'structure'
  
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState({}); // { "Class 1": 15000, "Class 2": 18000 }
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentTerm, setPaymentTerm] = useState('Full Year');

  const [editingStructure, setEditingStructure] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const results = await Promise.allSettled([
          getDocuments(COLLECTIONS.STUDENTS),
          getDocuments(COLLECTIONS.FEES),
          getDocuments(COLLECTIONS.CLASSES),
          getDocument(COLLECTIONS.FEE_STRUCTURES, 'global_all')
        ]);
        
        const [storedStudents, storedFees, storedClasses, storedFeeStructures] = results.map(r => r.status === 'fulfilled' ? r.value : null);
        
        if (storedStudents) setStudents(storedStudents);
        if (storedFees) setFeesData(storedFees);
        if (storedClasses) setClasses(storedClasses);
        if (storedFeeStructures) setFeeStructures(storedFeeStructures.structures || {});
      } catch (error) {
        console.error('Error loading finance data:', error);
      }
    };
    loadData();
  }, []);

  // Robust Calculations with useMemo
  const summary = useMemo(() => {
    // 1. Calculate Expected Fees (only for existing students and existing classes)
    const activeClassNames = new Set(classes.map(c => c.name));
    let expected = 0;
    students.forEach(student => {
      // Only count if class still exists
      if (activeClassNames.has(student.class)) {
        const classFee = feeStructures[student.class] || 0;
        expected += Number(classFee);
      }
    });

    // 2. Calculate Collected Fees (ONLY for students who still exist)
    const studentIds = new Set(students.map(s => s.id.toString()));
    const collected = feesData
      .filter(f => studentIds.has(f.studentId.toString()))
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);

    const pending = expected - collected;

    return { expected, collected, pending };
  }, [students, feeStructures, feesData, classes]);

  const handleSaveFeeStructure = async (e) => {
    e.preventDefault();
    if (!editingStructure || editingStructure.amount === '') return;

    try {
      const updatedStructures = {
        ...feeStructures,
        [editingStructure.className]: Number(editingStructure.amount)
      };

      await updateDocument(COLLECTIONS.FEE_STRUCTURES, 'global_all', { structures: updatedStructures });
      setFeeStructures(updatedStructures);
      setEditingStructure(null);
      showToast('Fee structure updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving fee structure:', error);
      showToast('Failed to save fee structure. Please check permissions.', 'error');
    }
  };

  const handlePayFee = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount) return;

    try {
      const newFeeRecord = {
        studentId: selectedStudent.id,
        amount: Number(paymentAmount),
        date: new Date().toISOString().split('T')[0],
        mode: paymentMode,
        term: paymentTerm
      };

      const savedFee = await addDocument(COLLECTIONS.FEES, newFeeRecord);
      setFeesData(prev => [...prev, savedFee]);
      setIsPaymentModalOpen(false);
      setSelectedStudent(null);
      setPaymentAmount('');
      showToast('Payment recorded successfully!', 'success');
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const getStudentFeeDetails = (student) => {
    const classFee = feeStructures[student.class] || 0;
    const studentPayments = feesData.filter(f => f.studentId.toString() === student.id.toString());
    const totalPaid = studentPayments.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const pending = Math.max(0, classFee - totalPaid);
    
    let status = 'Pending';
    if (classFee === 0) status = 'Not Set';
    else if (totalPaid >= classFee) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    
    return { classFee, totalPaid, pending, status };
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.rollNo && s.rollNo.toString().includes(searchTerm));
    const matchesClass = selectedClass === 'All' || s.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Finance & Fee Management</h1>
          <p className="text-slate-500 font-medium">Monitor real-time revenue and student dues.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-full max-w-sm border border-slate-200">
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'collection' 
              ? 'bg-white text-primary shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Collections
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'structure' 
              ? 'bg-white text-primary shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Structure
        </button>
      </div>

      {activeTab === 'collection' && (
        <>
          {/* Summary Cards - REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-500 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expected</p>
                <h3 className="text-3xl font-black text-slate-800">₹{summary.expected.toLocaleString('en-IN')}</h3>
                <div className="flex items-center mt-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Users className="w-3 h-3 mr-1" /> {students.length} Students
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                <FileText className="w-7 h-7" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-green-500 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Collected</p>
                <h3 className="text-3xl font-black text-green-600">₹{summary.collected.toLocaleString('en-IN')}</h3>
                <div className="flex items-center mt-2 text-[10px] font-bold text-green-600 uppercase">
                    <CheckCircle className="w-3 h-3 mr-1" /> {feesData.length} Receipts
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm group-hover:bg-green-600 group-hover:text-white transition-all">
                <IndianRupee className="w-7 h-7" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-red-500 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pending</p>
                <h3 className="text-3xl font-black text-red-600">₹{summary.pending.toLocaleString('en-IN')}</h3>
                <div className="flex items-center mt-2 text-[10px] font-bold text-red-600 uppercase">
                    <AlertCircle className="w-3 h-3 mr-1" /> Outstanding Dues
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all">
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search student or roll number..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary font-medium" 
                />
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="px-4 py-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary transition w-full sm:w-auto outline-none font-bold text-sm"
                >
                  <option value="All">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class & Roll</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(student => {
                    const { classFee, totalPaid, status } = getStudentFeeDetails(student);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 text-sm font-black text-slate-800 uppercase tracking-tight">{student.name}</td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-bold">{student.class || 'N/A'} <span className="mx-1 opacity-20">|</span> #{student.rollNo || 'N/A'}</td>
                        <td className="px-8 py-5 text-sm font-black text-slate-700">
                          {classFee > 0 ? `₹${classFee.toLocaleString('en-IN')}` : <span className="text-slate-300 font-medium italic">Not Set</span>}
                        </td>
                        <td className="px-8 py-5 text-sm font-black text-green-600">₹{totalPaid.toLocaleString('en-IN')}</td>
                        <td className="px-8 py-5">
                          {status === 'Paid' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-green-200">Paid</span>}
                          {status === 'Partial' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">Partial</span>}
                          {status === 'Pending' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-red-200">Pending</span>}
                          {status === 'Not Set' && <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">Unset</span>}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsPaymentModalOpen(true);
                            }}
                            disabled={status === 'Not Set' || status === 'Paid'}
                            className={`px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center ml-auto border shadow-sm ${
                              status === 'Not Set' || status === 'Paid'
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                                : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-white'
                            }`}
                          >
                            <Plus className="w-3 h-3 mr-2" /> Collection
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center text-slate-400 italic">
                        <Search className="w-10 h-10 mx-auto mb-4 opacity-10" />
                        No matching student records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'structure' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
                <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Class Fee Structure</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase">Define annual fees per class level.</p>
            </div>
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Annual Fee</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classes.map(cls => (
                  <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-black text-slate-800 uppercase">{cls.name}</td>
                    <td className="px-8 py-5 text-sm font-black text-slate-700">
                      {feeStructures[cls.name] ? (
                        <div className="flex items-center text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            ₹{feeStructures[cls.name].toLocaleString('en-IN')}
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-medium">Fee Not Configured</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setEditingStructure({ className: cls.name, amount: feeStructures[cls.name] || '' })}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 hover:text-primary hover:bg-primary/5 transition-all inline-flex items-center justify-center shadow-sm"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-8 py-20 text-center text-slate-400 italic">
                      No classes registered. Go to "Manage Classes" to add them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Record Fee Collection</h2>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="mb-8 bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Selected</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedStudent.name}</p>
                <p className="text-xs font-bold text-blue-600 mt-1 uppercase">{selectedStudent.class} | Roll #{selectedStudent.rollNo}</p>
                
                <div className="mt-4 pt-4 border-t border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Outstanding Balance</p>
                    <p className="text-lg font-black text-red-600">₹{getStudentFeeDetails(selectedStudent).pending.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePayFee} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Collection Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    max={getStudentFeeDetails(selectedStudent).pending}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-black text-lg"
                    placeholder="Enter amount"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Payment Mode</label>
                    <select 
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary bg-white font-bold text-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI / Online</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Installment / Term</label>
                    <select 
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value)}
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary bg-white font-bold text-sm"
                    >
                      <option value="Full Year">Full Year</option>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all"
                  >
                    Submit Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fee Structure Editing Modal */}
      {editingStructure && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Configure Class Fee</h2>
              <button 
                onClick={() => setEditingStructure(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleSaveFeeStructure} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Class Level</label>
                  <div className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-black uppercase">
                    {editingStructure.className}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Annual Fee (₹)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={editingStructure.amount}
                    onChange={(e) => setEditingStructure({ ...editingStructure, amount: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-black text-lg"
                    placeholder="Enter amount (e.g. 15000)"
                  />
                </div>
                
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingStructure(null)}
                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all"
                  >
                    Save Structure
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon Components
const Users = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const Clock = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default ManageFees;
