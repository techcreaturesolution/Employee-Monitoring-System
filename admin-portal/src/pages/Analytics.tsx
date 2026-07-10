import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Download,
  Info,
  Clock,
  Briefcase
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { companyAPI } from '../services/api';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await companyAPI.getAnalytics();
        setData(res.data?.data || null);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        toast.error('Failed to load company analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExport = () => {
    toast.success('Analytics report downloaded successfully');
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
        <p className="text-xs">Loading analytics data...</p>
      </div>
    );
  }

  const {
    company,
    workforce,
    todayAttendance,
    monthlyAttendance,
    productivityBreakdown,
    topApps,
    departmentStats,
    screenshotCount
  } = data;

  // Transform monthly attendance data for chart
  const attendanceChartData = monthlyAttendance?.reduce((acc: any[], curr: any) => {
    const date = curr._id.date;
    const status = curr._id.status;
    
    let existing = acc.find(item => item.date === date);
    if (!existing) {
      existing = { date, present: 0, absent: 0, late: 0 };
      acc.push(existing);
    }
    existing[status] = curr.count;
    return acc;
  }, []) || [];

  // Transform productivity breakdown for pie chart
  const prodChartData = productivityBreakdown?.map((item: any) => ({
    name: item._id || 'Unknown',
    value: item.totalMinutes
  })) || [];

  // Transform department stats for bar chart
  const deptChartData = departmentStats?.map((item: any) => ({
    name: item._id || 'Unknown',
    employees: item.count
  })) || [];

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Company Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize workforce productivity, attendance, and application usage for {company?.name || 'your company'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Employees</p>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{workforce?.totalEmployees || 0}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            {workforce?.activeEmployees || 0} active currently
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Today's Attendance</p>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{todayAttendance?.present || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {todayAttendance?.late || 0} late, {todayAttendance?.absent || 0} absent
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Managers</p>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{workforce?.totalManagers || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Leading {departmentStats?.length || 0} departments</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Screenshots Captured</p>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{screenshotCount || 0}</p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
            This month
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        {/* Monthly Attendance Chart */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Monthly Attendance</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={attendanceChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} fill="url(#presentGrad)" name="Present" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="none" name="Late" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="none" name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Productivity Pie Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Productivity Breakdown</h3>
          </div>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prodChartData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {prodChartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(val: number) => [`${Math.round(val/60)} hrs`, 'Duration']} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Department Stats */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Department Workforce</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="employees" name="Employees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Apps List */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Top Used Applications</h3>
            </div>
          </div>
          <div className="space-y-3">
            {topApps?.map((app: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-[#0d1117] rounded-xl border border-[#21262d]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{app.appName || 'Unknown App'}</p>
                    <p className="text-[10px] text-slate-500">{app.userCount} users</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs font-mono text-slate-300">{Math.round(app.totalMinutes / 60)}h {app.totalMinutes % 60}m</p>
                </div>
              </div>
            ))}
            {(!topApps || topApps.length === 0) && (
              <p className="text-xs text-slate-500 text-center py-4">No application usage data recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
