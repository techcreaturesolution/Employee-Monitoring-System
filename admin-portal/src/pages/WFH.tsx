import React, { useEffect, useState } from 'react';
import { wfhAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Globe,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface WFHRequest {
  _id: string;
  userId: { _id: string; name: string; email: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverNotes?: string;
  createdAt: string;
}

const WFH: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role !== 'employee';
  
  const [requests, setRequests] = useState<WFHRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<{ id: string, action: 'approve' | 'reject' } | null>(null);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let res;
      if (isAdminOrManager) {
        res = await wfhAPI.listAll({ search });
      } else {
        res = await wfhAPI.myRequests({ search });
      }
      setRequests(res.data.data.requests || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load WFH requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, search]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await wfhAPI.apply(form);
      toast.success('WFH Request submitted successfully');
      setShowApplyModal(false);
      setForm({ startDate: '', endDate: '', reason: '' });
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviewModal) return;
    try {
      const { id, action } = showReviewModal;
      if (action === 'approve') {
        await wfhAPI.approve(id, { notes: reviewNotes });
        toast.success('Request approved');
      } else {
        await wfhAPI.reject(id, { notes: reviewNotes });
        toast.success('Request rejected');
      }
      setShowReviewModal(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/20">Pending</span>;
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-500" /> WFH Requests
        </h1>
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Apply for WFH
        </button>
      </div>

      <div className="bg-[#161b22] rounded-xl border border-[#30363d] mb-4">
        <div className="p-4 border-b border-[#30363d]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#21262d]">
                <tr>
                  {isAdminOrManager && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Employee</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Dates</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Notes</th>
                  {isAdminOrManager && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrManager ? 6 : 4} className="px-4 py-8 text-center text-slate-500 text-sm">
                      No WFH requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req._id} className="hover:bg-[#21262d] transition-colors">
                      {isAdminOrManager && (
                        <td className="px-4 py-4">
                          <p className="font-medium text-white">{req.userId?.name}</p>
                          <p className="text-xs text-slate-500">{req.userId?.email}</p>
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400 max-w-[150px] truncate" title={req.approverNotes}>
                        {req.approverNotes || '-'}
                      </td>
                      {isAdminOrManager && (
                        <td className="px-4 py-4">
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setShowReviewModal({ id: req._id, action: 'approve' })} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setShowReviewModal({ id: req._id, action: 'reject' })} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Reviewed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#30363d]">
              <h2 className="text-lg font-bold text-white">Apply for Work From Home</h2>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Start Date*</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">End Date*</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reason*</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  placeholder="Reason for WFH..."
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#30363d] mt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d] rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#30363d]">
              <h2 className="text-lg font-bold text-white capitalize">{showReviewModal.action} WFH Request</h2>
              <button onClick={() => setShowReviewModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reviewer Notes (Optional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  placeholder="Add notes for the employee..."
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#30363d] mt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(null)}
                  className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d] rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all ${
                    showReviewModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-900/30' : 'bg-red-600 hover:bg-red-700 shadow-red-900/30'
                  }`}
                >
                  Confirm {showReviewModal.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WFH;
