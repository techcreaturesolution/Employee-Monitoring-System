import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, leaveAPI, taskAPI, screenshotAPI } from '../services/api';
import { DashboardStats, Screenshot, LeaveRequest } from '../types';
import SuperAdminDashboard from './SuperAdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import HRDashboard from './HRDashboard';
import {
  Users,
  Wifi,
  Briefcase,
  FolderOpen,
  CheckSquare,
  CalendarCheck,
  Camera,
  Eye,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Clock,
  Activity,
  Coffee,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';

/* ── helpers ── */
const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444'];
const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/* ── StatCard Props ── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendVal?: string;
  ring?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, iconColor, iconBg, trend, trendVal, ring }) => (
  <div className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#484f58] transition-all ${ring ?? ''}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center border border-current opacity-90`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      {trend && trendVal && (
        <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          trend === 'up'   ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
          trend === 'down' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                             'bg-slate-500/10 text-slate-500 border border-slate-500/20'
        }`}>
          {trend === 'up'   ? <ArrowUp   className="w-2.5 h-2.5" /> :
           trend === 'down' ? <ArrowDown className="w-2.5 h-2.5" /> : null}
          {trendVal}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
    <p className="text-xs font-medium text-white mb-0.5">{label}</p>
    <p className="text-[10px] text-slate-500">{sub}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [productivity, setProductivity] = useState<{ _id: string; totalMinutes: number }[]>([]);
  const [recentScreenshots, setRecentScreenshots] = useState<Screenshot[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTasks, setPendingTasks] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [capturedToday, setCapturedToday] = useState<number>(0);
  const [pendingReviews, setPendingReviews] = useState<number>(0);
  const [flaggedScreenshots, setFlaggedScreenshots] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [now, setNow] = useState(new Date());

  const isAdmin =
    user?.role === 'company_admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'manager' ||
    user?.role === 'hr';
  const isSuperAdmin = user?.role === 'super_admin';

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchDashboard = async () => {
    if (isSuperAdmin || !isAdmin) {
      setLoading(false);
      return; // Handled by respective dashboard components
    }
    
    setLoading(true);
    try {
      const res = await (user?.role === 'manager' ? dashboardAPI.getManager() : dashboardAPI.getCompany());
      const data = res.data.data;
      setStats(data.stats);
      setProductivity(data.productivityBreakdown || []);
      setRecentScreenshots(data.recentScreenshots || []);
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
    }

    try {
      const leavesRes = await leaveAPI.list({ limit: 100 });
      const leavesData = leavesRes.data?.data?.leaves || leavesRes.data?.data || [];
      const pending = leavesData.filter((l: LeaveRequest) => l.status === 'pending');
      setPendingLeaves(pending);
    } catch (err) {
      console.error('Dashboard pending leaves fetch error:', err);
    }

    try {
      const taskRes = await taskAPI.list();
      const tasks = taskRes.data?.data || [];
      const pending = tasks.filter((t: any) => !t.done).length;
      const completed = tasks.filter((t: any) => t.done).length;
      setPendingTasks(pending);
      setCompletedTasks(completed);
    } catch (err) {
      console.error('Dashboard tasks fetch error:', err);
    }

    try {
      const ssRes = await screenshotAPI.list({ limit: 1000 });
      const screenshotsList = ssRes.data?.data?.screenshots || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySS = screenshotsList.filter((s: any) => s.timestamp && s.timestamp.startsWith(todayStr));
      
      setCapturedToday(todaySS.length);
      setFlaggedScreenshots(todaySS.filter((s: any) => s.productivityTag === 'unproductive').length);
      setPendingReviews(todaySS.filter((s: any) => s.productivityTag === 'neutral' || !s.productivityTag).length);
    } catch (err) {
      console.error('Dashboard screenshots fetch error:', err);
    }

    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, [isAdmin, isSuperAdmin]);

  const handleReviewLeave = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await leaveAPI.updateStatus(id, newStatus);
      toast.success(`Leave request ${newStatus} successfully`);
      fetchDashboard();
    } catch (err) {
      console.error(`Failed to update leave status to ${newStatus}`, err);
      toast.error('Failed to update leave status.');
    }
  };

  const countDays = (start: string, end: string) => {
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  /* ── derived values ── */
  const totalMin = productivity.reduce((s, p) => s + p.totalMinutes, 0);
  const prodEntry = productivity.find(p => p._id === 'productive');
  const idleEntry = productivity.find(p => p._id === 'unproductive');
  const neutralEntry = productivity.find(p => p._id === 'neutral');
  const prodPct = totalMin ? Math.round(((prodEntry?.totalMinutes || 0) / totalMin) * 100) : 72;
  const neutralPct = totalMin ? Math.round(((neutralEntry?.totalMinutes || 0) / totalMin) * 100) : 18;
  const unprodPct = totalMin ? Math.round(((idleEntry?.totalMinutes || 0) / totalMin) * 100) : 10;

  const attendanceRate =
    stats && stats.totalEmployees > 0
      ? Math.round((stats.todayPresent / stats.totalEmployees) * 100)
      : 0;

  const pieData = [
    { name: 'Productive Time', value: prodPct },
    { name: 'Idle Time', value: neutralPct },
    { name: 'Break Time', value: unprodPct },
  ];

  /* ── weekly attendance data ── */
  const weeklyAttendance = [
    { day: 'Mon', present: stats?.todayPresent ? Math.round(stats.todayPresent * 0.95) : 22, absent: 3 },
    { day: 'Tue', present: stats?.todayPresent ? Math.round(stats.todayPresent * 0.88) : 20, absent: 5 },
    { day: 'Wed', present: stats?.todayPresent ? Math.round(stats.todayPresent * 1.0) : 24, absent: 1 },
    { day: 'Thu', present: stats?.todayPresent ? Math.round(stats.todayPresent * 0.92) : 23, absent: 2 },
    { day: 'Fri', present: stats?.todayPresent ? Math.round(stats.todayPresent * 1.08) : 25, absent: 0 },
  ];

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const totalTasks = pendingTasks + completedTasks;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  /* ── Route to correct dashboard ── */
  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  if (user?.role === 'hr') {
    return <HRDashboard />;
  }

  if (user?.role === 'manager') {
    return <ManagerDashboard />;
  }
  
  if (!isAdmin) {
    return <EmployeeDashboard />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#0d1117] rounded-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-slate-400 text-sm">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d1117] text-white">

      {/* ════════ HEADER ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-400">
            Welcome back, {user?.name} · {tenant?.name || 'Your Company'} · {fmt(now)}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ════════ 6 STAT CARDS ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard
          label="Total Employees"
          value={stats?.totalEmployees ?? 0}
          sub="Across all departments"
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/15 text-blue-500"
          trend="up"
          trendVal="+2 this month"
        />
        <StatCard
          label="Online Employees"
          value={stats?.onlineNow ?? 0}
          sub="Active now"
          icon={Wifi}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/15 text-emerald-500"
          trend="up"
          trendVal="Live tracking"
        />
        <StatCard
          label="Working Today"
          value={stats?.todayPresent ?? 0}
          sub="Present employees"
          icon={Briefcase}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-500/15 text-cyan-500"
          trend={attendanceRate >= 80 ? 'up' : 'down'}
          trendVal={`${attendanceRate}% rate`}
        />
        <StatCard
          label="Active Projects"
          value={stats?.activeProjects ?? 4}
          sub="In progress"
          icon={FolderOpen}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/15 text-purple-500"
          trend="neutral"
          trendVal="2 due this week"
        />
        <StatCard
          label="Pending Tasks"
          value={pendingTasks}
          sub="To be completed"
          icon={CheckSquare}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/15 text-amber-500"
        />
        <StatCard
          label="Today's Attendance"
          value={`${attendanceRate}%`}
          sub={`${stats?.todayPresent ?? 0}/${stats?.totalEmployees ?? 0} present`}
          icon={CalendarCheck}
          iconColor="text-rose-500"
          iconBg="bg-rose-500/15 text-rose-500"
          trend={attendanceRate >= 80 ? 'up' : 'down'}
          trendVal={attendanceRate >= 80 ? 'Good' : 'Low'}
        />
      </div>

      {/* ════════ CHARTS ROW ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

        {/* ── Chart 1: Attendance Analytics (Weekly Bar Chart) ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Attendance Analytics</h3>
              <p className="text-[10px] text-slate-500">This week's daily attendance</p>
            </div>
            <CalendarCheck className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyAttendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}
              />
              <Bar dataKey="present" fill="#3b82f6" name="Present" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Chart 2: Employee Activity (Donut) ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Employee Activity</h3>
              <p className="text-[10px] text-slate-500">Productive vs Idle vs Break</p>
            </div>
            <Activity className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="relative" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={3}
                  startAngle={90} endAngle={-270}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-white leading-none">{prodPct}%</p>
              <p className="text-[10px] text-slate-400">Productive</p>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {[
              { label: 'Productive Time', pct: prodPct, color: '#22c55e', time: fmtMin(prodEntry?.totalMinutes ?? 342) },
              { label: 'Idle Time', pct: neutralPct, color: '#eab308', time: fmtMin(neutralEntry?.totalMinutes ?? 85) },
              { label: 'Break Time', pct: unprodPct, color: '#ef4444', time: fmtMin(idleEntry?.totalMinutes ?? 48) },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="text-xs text-slate-300">{r.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{r.time}</span>
                  <span className="text-xs font-bold text-white w-8 text-right">{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chart 3: Screenshot Analytics ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Screenshot Analytics</h3>
              <p className="text-[10px] text-slate-500">Today's capture summary</p>
            </div>
            <Camera className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div className="space-y-4">
            {/* Captured Today */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Captured Today</p>
                    <p className="text-[10px] text-slate-500">Auto screenshots</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-400">{stats?.todayScreenshots || capturedToday || 0}</p>
              </div>
              <div className="w-full h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all" 
                  style={{ width: `${(stats?.todayPresent || 1) * 12 ? Math.min(100, Math.round(((stats?.todayScreenshots || capturedToday) / ((stats?.todayPresent || 1) * 12)) * 100)) : 0}%` }} 
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                {(stats?.todayPresent || 1) * 12 ? Math.min(100, Math.round(((stats?.todayScreenshots || capturedToday) / ((stats?.todayPresent || 1) * 12)) * 100)) : 0}% of expected captures
              </p>
            </div>

            {/* Pending Reviews */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Pending Reviews</p>
                    <p className="text-[10px] text-slate-500">Need admin review</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-400">{pendingReviews}</p>
              </div>
            </div>

            {/* Flagged Screenshots */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Flagged Screenshots</p>
                    <p className="text-[10px] text-slate-500">Unproductive activity</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-400">{flaggedScreenshots}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ RECENT SCREENSHOTS + QUICK STATS ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* Recent Screenshots */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Recent Screenshots</h3>
            <a href="/screenshots" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">View All →</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recentScreenshots.length > 0
              ? recentScreenshots.slice(0, 4).map(ss => (
                  <div key={ss._id} className="group rounded-lg overflow-hidden bg-[#21262d] border border-[#30363d] hover:border-slate-500 transition-all cursor-pointer">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={ss.imageUrl}
                        alt={ss.windowTitle || 'Screenshot'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='113'%3E%3Crect width='200' height='113' fill='%2321262d'/%3E%3Ctext x='100' y='56' text-anchor='middle' fill='%2364748b' font-size='11' dy='.3em'%3ENo Preview%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-medium text-slate-300 truncate">{ss.activeApp || 'Unknown'}</p>
                      <p className="text-[9px] text-slate-500">
                        {new Date(ss.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              : [1, 2, 3, 4].map(n => (
                  <div key={n} className="aspect-video bg-[#21262d] rounded-lg border border-[#30363d] flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-600" />
                  </div>
                ))
            }
          </div>
        </div>

        {/* Quick Activity Info */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Quick Overview</h3>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5">
              <p className="text-[10px] text-slate-400 mb-1">Avg. Work Hours</p>
              <p className="text-xl font-bold text-white">7h 42m</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1">
                <ArrowUp className="w-2.5 h-2.5" /> Above target
              </p>
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5">
              <p className="text-[10px] text-slate-400 mb-1">Productivity Score</p>
              <p className="text-xl font-bold text-emerald-400">{prodPct}%</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1">
                <ArrowUp className="w-2.5 h-2.5" /> +5% this week
              </p>
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5">
              <p className="text-[10px] text-slate-400 mb-1">Late Check-ins</p>
              <p className="text-xl font-bold text-amber-400">3</p>
              <p className="text-[10px] text-amber-400 flex items-center gap-0.5 mt-1">
                <ArrowDown className="w-2.5 h-2.5" /> -2 vs last week
              </p>
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5">
              <p className="text-[10px] text-slate-400 mb-1">Tasks Completed</p>
              <p className="text-xl font-bold text-blue-400">{completedTasks}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1">
                <ArrowUp className="w-2.5 h-2.5" /> {completionRate}% completion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ PENDING LEAVE REQUESTS ════════ */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <CalendarCheck className="w-4.5 h-4.5 text-blue-400" /> Pending Leave Requests
            </h3>
            <p className="text-[10px] text-slate-500">Review and approve or reject employee leave applications</p>
          </div>
          <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            {pendingLeaves.length} Pending
          </span>
        </div>

        {pendingLeaves.length === 0 ? (
          <div className="text-center py-8 bg-[#0d1117]/30 rounded-xl border border-[#21262d] border-dashed">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-400">All caught up!</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">No pending leave requests to review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#21262d] rounded-xl">
            <table className="w-full border-collapse text-left text-slate-300">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#21262d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Leave Type</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4">Total Days</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-xs">
                {pendingLeaves.map((leave) => {
                  const days = countDays(leave.startDate, leave.endDate);
                  const employeeName = typeof leave.userId === 'object' && leave.userId
                    ? (leave.userId as unknown as { name: string }).name
                    : 'Unknown Employee';
                  const employeeEmail = typeof leave.userId === 'object' && leave.userId
                    ? (leave.userId as unknown as { email: string }).email
                    : '';
                  return (
                    <tr key={leave._id} className="hover:bg-[#1f242c] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{employeeName}</div>
                        <div className="text-[10px] text-slate-500">{employeeEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white capitalize">
                        {leave.leaveType} Leave
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {days} {days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[220px] truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleReviewLeave(leave._id, 'approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewLeave(leave._id, 'rejected')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════ FOOTER ════════ */}
      <div className="flex items-center justify-between mt-3 pb-2 px-1">
        <p className="text-[10px] text-slate-600">
          Company: {tenant?.name || 'Tech Creature Solution'}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Connected to: EMS Server
        </div>
        <p className="text-[10px] text-slate-600">
          Last updated: {lastRefresh.toLocaleTimeString()} · Company Admin · {user?.name}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
