import React, { useState, useEffect } from 'react';
import { tenantAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Ban,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionItem {
  id: string;
  companyName: string;
  plan: 'Free' | 'Starter' | 'Business' | 'Enterprise';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  nextBilling: string;
  status: 'active' | 'past_due' | 'cancelled';
  autoRenew: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  past_due: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/25',
};

const Subscriptions: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    if (user?.role === 'super_admin') {
      setLoading(true);
      try {
        const res = await tenantAPI.list();
        const tenantsList = res.data.data.tenants || [];
        const planAmount: Record<string, number> = { enterprise: 299, business: 199, starter: 99, free: 0 };
        const mapped = tenantsList.map((t: any) => {
          const planKey = t.plan?.toLowerCase() || 'free';
          const amt = planAmount[planKey] !== undefined ? planAmount[planKey] : 0;
          return {
            id: t._id,
            companyName: t.name,
            plan: (t.plan?.charAt(0).toUpperCase() + t.plan?.slice(1)) || 'Free',
            amount: amt,
            billingCycle: 'monthly',
            startDate: t.createdAt ? t.createdAt.split('T')[0] : '2025-01-15',
            nextBilling: t.createdAt ? new Date(new Date(t.createdAt).setMonth(new Date(t.createdAt).getMonth() + 1)).toISOString().split('T')[0] : '2026-07-15',
            status: t.status === 'suspended' ? 'cancelled' : (t.status === 'trial' ? 'past_due' : 'active'),
            autoRenew: t.status === 'active',
          };
        });
        setSubs(mapped);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setSubs([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const handleCancelSub = async (id: string) => {
    try {
      const sub = subs.find(s => s.id === id);
      await tenantAPI.update(id, { plan: 'free', status: 'suspended' });
      toast.success('Subscription cancelled successfully');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleActivateSub = async (id: string) => {
    try {
      const sub = subs.find(s => s.id === id);
      await tenantAPI.update(id, { plan: 'business', status: 'active' });
      toast.success('Subscription activated successfully');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to reactivate subscription');
    }
  };

  const filteredSubs = subs.filter(s => {
    const matchesSearch = s.companyName.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalMonthlyRecurring = subs
    .filter(s => s.status === 'active')
    .reduce((acc, curr) => acc + (curr.billingCycle === 'monthly' ? curr.amount : Math.round(curr.amount / 12)), 0);

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-purple-400" />
            Subscription Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitor client plans, billings, and renewal cycles</p>
        </div>
      </div>

      {/* ── Analytics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Recurring Revenue</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">${totalMonthlyRecurring.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="w-3 h-3" /> +12.4% vs last month
          </p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Subscriptions</p>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{subs.filter(s => s.status === 'active').length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Out of {subs.length} total signups</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Pending Renewals</p>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{subs.filter(s => s.status === 'past_due').length}</p>
          <p className="text-[10px] text-amber-400 mt-0.5">Requires immediate attention</p>
        </div>
      </div>

      {/* ── Search & Filter Row ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriptions by company name or ID..."
            className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'past_due', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-all ${
                filterStatus === status
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-semibold'
                  : 'bg-transparent text-slate-400 border-[#30363d] hover:text-white'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-3" />
          <p className="text-slate-400 text-xs">Loading subscriptions...</p>
        </div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#161b22]">
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subscription ID</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company Name</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan Name</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Billing Date</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] bg-[#0d1117]/50">
                {filteredSubs.map((s) => (
                  <tr key={s.id} className="hover:bg-[#161b22]/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-300 font-mono">{s.id}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-white">{s.companyName}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-white">
                      ${s.amount} <span className="text-[10px] text-slate-500 font-normal">/{s.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-300">Next: {new Date(s.nextBilling).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-500">Started: {new Date(s.startDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[s.status]}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleCancelSub(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-md text-[10px] font-semibold transition-all"
                          >
                            <Ban className="w-3 h-3" />
                            Cancel Sub
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateSub(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-md text-[10px] font-semibold transition-all"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      <Layers className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                      <p className="text-xs">No active subscriptions found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
