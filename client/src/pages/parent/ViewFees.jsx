import React, { useState, useEffect, useMemo } from 'react';
import { IndianRupee, Download, AlertCircle, CheckCircle, Clock, Receipt, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getDocuments, COLLECTIONS } from '../../api/apiService';

const ViewFees = () => {
  const { userData } = useAuth();
  const [feeRecords, setFeeRecords] = useState([]);
  const [totalFee, setTotalFee] = useState(0);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const studentId = userData?.studentId;
      const studentClass = userData?.class;
      if (!studentId) return;

      try {
        const [myChild, structuresDoc, allFees] = await Promise.all([
          getDocument(COLLECTIONS.STUDENTS, studentId.toString()),
          getDocument('fee_structures', 'global_all'),
          getDocuments(COLLECTIONS.FEES)
        ]);

        setStudentName(myChild?.name || 'Student');
        
        const classFee = structuresDoc?.structures?.[studentClass] || 0;
        setTotalFee(classFee);

        const myPayments = allFees.filter(f => f.studentId?.toString() === studentId.toString());
        myPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        setFeeRecords(myPayments);
      } catch (error) {
        console.error('Error loading fees data:', error);
      }
    };
    loadData();
  }, [userData]);

  const stats = useMemo(() => {
    const paid = feeRecords.reduce((sum, r) => sum + r.amount, 0);
    const pending = Math.max(0, totalFee - paid);
    return { paid, pending };
  }, [feeRecords, totalFee]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fees Status</h1>
          <p className="text-slate-500 font-bold">Student: <span className="text-primary">{studentName}</span> | Session 2026-27</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-3">Status:</span>
            {stats.pending === 0 && totalFee > 0 ? (
                <span className="flex items-center text-green-600 font-black text-sm uppercase">
                    <CheckCircle className="w-4 h-4 mr-1" /> All Clear
                </span>
            ) : (
                <span className="flex items-center text-amber-600 font-black text-sm uppercase">
                    <Clock className="w-4 h-4 mr-1" /> Dues Pending
                </span>
            )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <IndianRupee className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fees</span>
          </div>
          <p className="text-3xl font-black text-slate-800">₹{totalFee.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1 font-bold">Annual Course Fee</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid Amount</span>
          </div>
          <p className="text-3xl font-black text-green-600">₹{stats.paid.toLocaleString('en-IN')}</p>
          <p className="text-xs text-green-600/60 mt-1 font-bold">Total Collection Received</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-xl transition-all relative overflow-hidden">
          {stats.pending > 0 && (
              <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${stats.pending > 0 ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-200'}`}>
                <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Dues</span>
          </div>
          <p className={`text-3xl font-black ${stats.pending > 0 ? 'text-red-600' : 'text-slate-400'}`}>₹{stats.pending.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1 font-bold italic">{stats.pending > 0 ? 'Kindly pay by due date' : 'No balance remaining'}</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center">
            <Receipt className="w-5 h-5 text-primary mr-2" />
            <h2 className="font-black text-slate-800 uppercase tracking-wider text-sm">Payment Transaction History</h2>
          </div>
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase">Records: {feeRecords.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Receipt ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Description / Term</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Mode</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black font-mono text-slate-400 group-hover:text-primary transition-colors">#{record.id}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div>
                        <p className="text-sm font-black text-slate-800 uppercase">{record.term}</p>
                        <p className="text-[10px] font-bold text-slate-400">{new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center text-slate-600 font-bold text-xs uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 mr-2 opacity-50" />
                        {record.mode}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-base font-black text-slate-800">₹{record.amount.toLocaleString('en-IN')}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase border border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1.5" /> PAID
                    </span>
                  </td>
                </tr>
              ))}
              {feeRecords.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <IndianRupee className="w-8 h-8" />
                        </div>
                        <h3 className="text-slate-800 font-black uppercase text-sm mb-1">No Transactions Found</h3>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed">No fee payments have been recorded for your child yet in this session.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Section */}
      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <AlertCircle className="w-5 h-5" />
        </div>
        <div>
            <p className="text-sm font-black text-amber-800 uppercase mb-1">Important Payment Notice</p>
            <p className="text-xs text-amber-700/70 font-bold leading-relaxed">
                Receipts for online payments are generated instantly. For Cash/Cheque payments, please wait for 24-48 hours for the status to be updated in this portal. In case of any discrepancy, please contact the school account office with your physical receipt.
            </p>
        </div>
      </div>
    </div>
  );
};

export default ViewFees;
