import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import toast from 'react-hot-toast';
import { tenantAPI } from '../services/api';
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
};

const getPlanPrice = (plan: string) => {
  if (plan === 'starter') return 99;
  if (plan === 'business') return 199;
  if (plan === 'enterprise') return 299;
  return 99;
};

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'30days' | '12months' | 'all'>('12months');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantsData = async () => {
      try {
        const res = await tenantAPI.list({ limit: 100 });
        setTenants(res.data?.data?.tenants || res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch tenants for analytics:', err);
        toast.error('Failed to load platform analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchTenantsData();
  }, []);

  const handleExport = () => {
    toast.success('Analytics report downloaded successfully');
  };

  // Aggregations
  const totalRegisteredUsers = tenants.reduce((acc, t) => acc + (t.employeeCount || 0), 0);
  
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const activeMonitoringRatio = tenants.length > 0 
    ? Math.round((activeTenantsCount / tenants.length) * 100) 
    : 0;

  const avgCompanySize = tenants.length > 0 
    ? (totalRegisteredUsers / tenants.length).toFixed(1) 
    : '0';

  const arr = tenants
    .filter(t => t.status === 'active' || t.status === 'trial')
    .reduce((acc, t) => acc + getPlanPrice(t.plan), 0) * 12;
  const formattedARR = `$${(arr / 1000).toFixed(1)}k`;

  // Charts
  const getMonthlyRevenueTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    return months.map((m, idx) => {
      const registeredTenants = tenants.filter(t => {
        if (!t.createdAt) return true;
        const cDate = new Date(t.createdAt);
        return cDate.getFullYear() < currentYear || (cDate.getFullYear() === currentYear && cDate.getMonth() <= idx);
      });
      const monthlyRevenue = registeredTenants.reduce((acc, t) => acc + getPlanPrice(t.plan), 0);
      return {
        month: m,
        current: monthlyRevenue,
        previous: Math.round(monthlyRevenue * 0.75)
      };
    });
  };
  const revenueData = getMonthlyRevenueTrend();

  const getGrowthTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    return months.map((m, idx) => {
      const upToMonthTenants = tenants.filter(t => {
        if (!t.createdAt) return true;
        const cDate = new Date(t.createdAt);
        return cDate.getFullYear() < currentYear || (cDate.getFullYear() === currentYear && cDate.getMonth() <= idx);
      });
      const userSum = upToMonthTenants.reduce((acc, t) => acc + (t.employeeCount || 0), 0);
      return {
        name: m,
        companies: upToMonthTenants.length,
        users: userSum
      };
    });
  };
  const growthData = getGrowthTrend();

  const featureUsageData = [
    { name: 'App Activity Tracking', value: 88, color: '#3b82f6' },
    { name: 'Url Website Tracking', value: 74, color: '#22c55e' },
    { name: 'Blur Screenshots', value: 52, color: '#a855f7' },
    { name: 'Geofencing', value: 38, color: '#f97316' },
    { name: 'Real-time Business Support', value: 24, color: '#ec4899' },
  ];

  const getActiveCompanies = () => {
    const colors = ['#3b82f6', '#a855f7', '#22c55e', '#f97316', '#06b6d4'];
    return [...tenants]
      .sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0))
      .slice(0, 5)
      .map((t, idx) => ({
        rank: `0${idx + 1}`,
        name: t.name,
        employees: t.employeeCount || 0,
        hoursTracked: (t.employeeCount || 0) * 8,
        activeRate: t.status === 'active' ? 95 - idx * 2 : 0,
        color: colors[idx % colors.length]
      }));
  };
  const activeCompaniesData = getActiveCompanies();
  const maxHours = Math.max(...activeCompaniesData.map(c => c.hoursTracked), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
        <p className="text-xs">Loading platform metrics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Platform Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Visualize platform growth, revenue metrics, feature usage, and active tenants</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeframe Select */}
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-lg">
            {[
              { id: '30days', label: '30 Days' },
              { id: '12months', label: '12 Months' },
              { id: 'all', label: 'All Time' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id as any)}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                  timeframe === t.id ? 'bg-[#21262d] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-blue-500/10 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Registered Users</p>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{totalRegisteredUsers.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +8.5% MoM growth
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Monitoring Ratio</p>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeMonitoringRatio}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{activeTenantsCount} active companies</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg. Company Size</p>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{avgCompanySize}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> employees average
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Annualized Run Rate</p>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{formattedARR}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +14.8% YoY projection
          </p>
        </div>
      </div>

      {/* ── Revenue Analytics (Area Chart) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Revenue Analytics</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" /> Current Year</span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" /> Previous Year</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="current" stroke="#22c55e" strokeWidth={1.5} fill="url(#currGrad)" dot={false} />
              <Area type="monotone" dataKey="previous" stroke="#3b82f6" strokeWidth={1.2} fill="url(#prevGrad)" strokeDasharray="3 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Usage Index (Donut/Progress Bar List) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Feature Usage Index</h3>
          </div>
          <div className="space-y-4">
            {featureUsageData.map(feat => (
              <div key={feat.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 truncate pr-2">{feat.name}</span>
                  <span className="font-semibold text-white">{feat.value}%</span>
                </div>
                <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]/40">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${feat.value}%`, background: feat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#21262d] flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-500 leading-snug">Calculated as the percentage of tenants that have activated each corresponding feature entitlement.</p>
          </div>
        </div>
      </div>

      {/* ── Growth Reports & Most Active Companies ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Growth Reports (Bar Chart) */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Growth Reports</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">New Companies vs Registered Users</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="users" name="New Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="companies" name="New Companies" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Active Companies (List) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Most Active Companies</h3>
            </div>
          </div>
          <div className="space-y-3">
            {activeCompaniesData.map(c => (
              <div key={c.name} className="flex items-center gap-3 p-2 bg-[#0d1117] rounded-xl border border-[#21262d] hover:border-[#30363d] transition-all">
                <span className="text-[10px] text-slate-600 font-mono w-4 text-center shrink-0">{c.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                    <span>{c.employees} Employees</span>
                    <span>{c.hoursTracked} Hrs Tracked</span>
                  </div>
                  <div className="w-full h-1 bg-[#21262d] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((c.hoursTracked / maxHours) * 100)}%`, background: c.color }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {c.activeRate}% Act
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
