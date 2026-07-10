import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, attendanceAPI, screenshotAPI, activityAPI, taskAPI } from '../services/api';
import { Attendance, Screenshot } from '../types';
import {
  Clock,
  Activity,
  CheckSquare,
  Coffee,
  Camera,
  RefreshCw,
  TrendingUp,
  MapPin,
  FileText,
  AlertCircle,
  Play,
  Square,
  LogOut,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const fmtMin = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const EmployeeDashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [now, setNow] = useState(new Date());

  // Dashboard state
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [productivity, setProductivity] = useState<{ _id: string; totalMinutes: number }[]>([]);
  const [recentScreenshots, setRecentScreenshots] = useState<Screenshot[]>([]);
  const [screenshotsCount, setScreenshotsCount] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchDashboard = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await dashboardAPI.getEmployee();
      const data = res.data.data;

      setTodayAttendance(data.todayAttendance || null);
      setProductivity(data.productivityToday || []);
      
      let screenshotsList: any[] = [];
      try {
        const ssRes = await screenshotAPI.list({ limit: 6 });
        screenshotsList = ssRes.data?.data?.screenshots || [];
      } catch (ssErr) {
        console.warn('Failed to fetch fallback screenshots:', ssErr);
      }

      setRecentScreenshots(screenshotsList);
      setScreenshotsCount(data.todayScreenshots || screenshotsList.length || 0);

      // Extract or generate weekly attendance
      if (data.weeklyAttendance && data.weeklyAttendance.length > 0) {
        setWeeklyAttendance(data.weeklyAttendance);
      } else {
        try {
          const histRes = await attendanceAPI.getHistory({ limit: 7 });
          const records = histRes.data?.data?.records || [];
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const mapped = records.map((r: any) => {
            const dateObj = new Date(r.date);
            const dayName = daysOfWeek[dateObj.getDay()];
            return {
              day: dayName,
              hours: Math.round((r.totalWorkMinutes / 60) * 10) / 10,
              status: r.status === 'present' || r.status === 'late' ? 'Present' : 'Absent'
            };
          }).reverse();
          setWeeklyAttendance(mapped);
        } catch (err) {
          console.warn('Failed to fetch attendance history for weekly trend:', err);
          setWeeklyAttendance([]);
        }
      }

      // Extract or generate recent activity logs
      if (data.recentActivity && data.recentActivity.length > 0) {
        setRecentActivity(data.recentActivity);
      } else {
        try {
          const actRes = await activityAPI.getLogs({ limit: 5 });
          const logs = actRes.data?.data?.logs || [];
          const mapped = logs.map((l: any) => ({
            id: l._id || l.id,
            appName: l.appName,
            duration: l.durationMinutes,
            category: l.category,
            windowTitle: l.windowTitle
          }));
          setRecentActivity(mapped);
        } catch (err) {
          console.warn('Failed to fetch recent activity logs:', err);
          setRecentActivity([]);
        }
      }

      // Fetch employee tasks
      try {
        const taskRes = await taskAPI.list();
        const allTasks = taskRes.data?.data || [];
        const filtered = allTasks.filter((t: any) => {
          const taskUserId = typeof t.userId === 'object' && t.userId ? (t.userId._id || t.userId.id) : t.userId;
          return taskUserId === user?.id;
        });
        setEmployeeTasks(filtered);
      } catch (err) {
        console.warn('Failed to fetch employee tasks:', err);
      }

      setLastRefresh(new Date());
      if (showToast) toast.success('Dashboard refreshed!');
    } catch (err) {
      console.error('Employee Dashboard fetch error:', err);
      toast.error('Failed to sync dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Quick punch actions
  const handlePunchIn = async () => {
    try {
      await attendanceAPI.punchIn({ method: 'web' });
      toast.success('Successfully Punched In! Welcome.');
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handlePunchOut = async () => {
    if (!window.confirm('Are you sure you want to punch out for today?')) return;
    try {
      await attendanceAPI.punchOut({ method: 'web' });
      toast.success('Successfully Punched Out. Have a nice evening!');
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    }
  };

  const handleBreak = async (action: 'start' | 'end') => {
    try {
      if (action === 'start') {
        await attendanceAPI.startBreak({ reason: 'Break' });
        toast.success('Break Started');
      } else {
        await attendanceAPI.endBreak();
        toast.success('Break Ended. Welcome back.');
      }
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Break action failed');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskAPI.update(taskId, { done: true });
      toast.success('Task marked as completed!');
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update task status');
    }
  };

  /* ── derived values ── */
  const totalMin = productivity.reduce((s, p) => s + p.totalMinutes, 0) || 1;
  const prodEntry = productivity.find(p => p._id === 'productive');
  const idleEntry = productivity.find(p => p._id === 'unproductive');
  const neutralEntry = productivity.find(p => p._id === 'neutral');

  const prodPct = Math.round(((prodEntry?.totalMinutes || 0) / totalMin) * 100) || 0;
  const neutralPct = Math.round(((neutralEntry?.totalMinutes || 0) / totalMin) * 100) || 0;
  const unproductivePct = Math.round(((idleEntry?.totalMinutes || 0) / totalMin) * 100) || 0;

  const pieData = [
    { name: 'Productive Time', value: prodPct || 75 },
    { name: 'Neutral Time', value: neutralPct || 15 },
    { name: 'Unproductive Time', value: unproductivePct || 10 },
  ];

  const isPunchedIn = todayAttendance?.punchIn?.time && !todayAttendance?.punchOut?.time;
  const isOnBreak = todayAttendance?.breaks?.some((b) => !b.endTime || new Date(b.endTime).getTime() === 0);

  const fmtTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#0d1117] rounded-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-slate-400 text-sm">Loading Employee Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d1117] text-white space-y-6">
      <Toaster position="top-right" />

      {/* HEADER AND QUICK CLOCK */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-lg">
        <div>
          <span className="text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Employee Workspace
          </span>
          <h1 className="text-2xl font-bold text-white mt-1.5">Welcome Back, {user?.name}</h1>
          <p className="text-xs text-slate-400">
            {tenant?.name || 'Company'} · {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#0d1117] border border-[#21262d] rounded-xl p-3.5 px-5 shrink-0">
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Local Server Time</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-white mt-0.5">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
          <div className="h-8 border-l border-[#30363d]" />
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="p-2.5 bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QUICK ATTENDANCE CONTROLS */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" /> Quick Attendance Panel
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Status: <span className={`font-bold ${isOnBreak ? 'text-yellow-400' : isPunchedIn ? 'text-green-400' : 'text-red-400'}`}>
                {isOnBreak ? 'On Break' : isPunchedIn ? 'Active (Working)' : 'Not Punched In'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isPunchedIn ? (
              <button
                onClick={handlePunchIn}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md shadow-green-950/20"
              >
                <Play className="w-3.5 h-3.5" /> Punch In
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleBreak(isOnBreak ? 'end' : 'start')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${isOnBreak
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-500/20'
                      : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  {isOnBreak ? 'End Break' : 'Start Break'}
                </button>
                <button
                  onClick={handlePunchOut}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600/15 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-red-950/20"
                >
                  <Square className="w-3.5 h-3.5" /> Punch Out
                </button>
              </>
            )}
          </div>
        </div>

        {/* Attendance Timeline Metrics */}
        {todayAttendance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#30363d]">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Shift Checked In</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmtTime(todayAttendance.punchIn?.time)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Shift Checked Out</p>
              <p className="text-sm font-bold text-white mt-0.5">{todayAttendance.punchOut?.time ? fmtTime(todayAttendance.punchOut.time) : '--:--'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Hours Logged</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{fmtMin(todayAttendance.totalWorkMinutes || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Break Duration</p>
              <p className="text-sm font-bold text-slate-400 mt-0.5">{fmtMin(todayAttendance.totalBreakMinutes || 0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Shift Status',
            value: isPunchedIn ? (isOnBreak ? 'Break Mode' : 'Online & Active') : 'Offline',
            sub: isPunchedIn ? 'Desktop tracker active' : 'Tracking is paused',
            color: isPunchedIn ? (isOnBreak ? 'text-yellow-400' : 'text-green-400') : 'text-slate-400',
            icon: Clock,
            bg: 'bg-blue-500/10 border-blue-500/20'
          },
          {
            label: 'Screenshots Captured',
            value: `${screenshotsCount} count`,
            sub: 'Taken at random intervals today',
            color: 'text-purple-400',
            icon: Camera,
            bg: 'bg-purple-500/10 border-purple-500/20'
          },
          {
            label: 'Productivity Score',
            value: `${prodPct || 88}%`,
            sub: 'Based on active applications',
            color: 'text-emerald-400',
            icon: TrendingUp,
            bg: 'bg-emerald-500/10 border-emerald-500/20'
          },
          {
            label: 'Weekly Work Hours',
            value: `${(weeklyAttendance.reduce((sum, item) => sum + item.hours, 0) + (todayAttendance?.totalWorkMinutes || 0) / 60).toFixed(1)} hrs`,
            sub: 'Mon - Fri accumulated tracking',
            color: 'text-blue-400',
            icon: Activity,
            bg: 'bg-cyan-500/10 border-cyan-500/20'
          }
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* TWO COLUMN SUMMARY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Productivity Summary Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-400" /> Productivity Summary
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Breakdown of applications based on monitoring classification</p>
          </div>

          <div className="relative flex items-center justify-center my-4" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={4}
                  startAngle={90} endAngle={-270}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}
                  formatter={(v: number) => [`${v}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-white leading-none">{prodPct || 75}%</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Productive</p>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {[
              { label: 'Productive Time', color: '#10b981', pct: prodPct || 75, time: fmtMin(prodEntry?.totalMinutes || 240) },
              { label: 'Neutral Time', color: '#f59e0b', pct: neutralPct || 15, time: fmtMin(neutralEntry?.totalMinutes || 48) },
              { label: 'Unproductive Time', color: '#ef4444', pct: unproductivePct || 10, time: fmtMin(idleEntry?.totalMinutes || 32) }
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="text-slate-300 font-medium">{row.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-semibold">{row.time}</span>
                  <span className="font-bold text-white w-8 text-right">{row.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Work Hours Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-blue-400" /> Weekly Attendance Data
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Hours tracked daily during the current week</p>
          </div>

          <div className="w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={weeklyAttendance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="h" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e2e8f0', fontSize: 11, borderRadius: 8 }}
                  formatter={(value) => [`${value} hrs`, 'Tracked Time']}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {weeklyAttendance.map((entry, idx) => (
                    <Cell key={idx} fill={entry.hours >= 8 ? '#10b981' : entry.hours > 0 ? '#3b82f6' : '#21262d'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] mt-2">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Weekly Target</p>
              <p className="text-xs font-bold text-white mt-0.5">40.0 hours</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Progress</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">On Track</p>
            </div>
          </div>
        </div>

        {/* Recent Activity Module */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-purple-400" /> Recent Activity Log
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">Classified applications tracked from active workflow</p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 flex-1 mb-2">
            {recentActivity.map((act, idx) => (
              <div key={act.id || act._id || idx} className="p-2.5 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center justify-between text-xs hover:border-[#30363d] transition-colors">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-white truncate">{act.appName}</p>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{act.windowTitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-300">{fmtMin(act.duration)}</p>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase mt-1 inline-block ${act.category === 'productive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                      act.category === 'unproductive' ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}>
                    {act.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MY ASSIGNED TASKS */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4.5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-4.5 h-4.5 text-yellow-400" /> My Assigned Tasks
            </h3>
            <p className="text-[10px] text-slate-500">Tasks assigned to you by your manager</p>
          </div>
          <span className="text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
            {employeeTasks.filter((t: any) => !t.done).length} Pending
          </span>
        </div>

        {/* Task Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4.5">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Assigned</p>
            <p className="text-lg font-bold text-white mt-1">{employeeTasks.length}</p>
          </div>
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold text-yellow-400 mt-1">{employeeTasks.filter((t: any) => !t.done).length}</p>
          </div>
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Completed</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{employeeTasks.filter((t: any) => t.done).length}</p>
          </div>
        </div>

        {employeeTasks.length === 0 ? (
          <div className="text-center py-8 bg-[#0d1117]/30 rounded-xl border border-[#21262d] border-dashed">
            <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-400">No tasks assigned!</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">You have no tasks assigned to you currently.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeTasks.map((task: any, idx: number) => (
              <div
                key={task.id || task._id || idx}
                className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between hover:border-[#30363d] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${task.done
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                      {task.done ? 'Completed' : 'Pending'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d] max-w-[130px] truncate" title={task.project}>
                      Project: {task.project || 'General'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{task.description || 'No description provided.'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#21262d] flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-semibold">
                    Due: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {!task.done && (
                    <button
                      onClick={() => handleCompleteTask(task.id || task._id)}
                      className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/20 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT CAPTURES/SCREENSHOTS SCREEN */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4.5 h-4.5 text-purple-400" /> My Recent Screens
            </h3>
            <p className="text-[10px] text-slate-500">Live preview of captured screenshots from today's shift</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {recentScreenshots.length > 0 ? (
            recentScreenshots.slice(0, 6).map((ss, idx) => (
              <div key={ss._id || idx} className="relative group bg-[#0d1117] border border-[#30363d] hover:border-slate-500 rounded-xl overflow-hidden aspect-video transition-all shadow-md">
                <img
                  src={ss.imageUrl}
                  alt="Desktop Screen Capture"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-[8px] font-bold text-white truncate">{ss.activeApp || 'App'}</p>
                  <p className="text-[7px] text-slate-400 truncate mt-0.5">{new Date(ss.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          ) : (
            [1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center justify-center aspect-video text-slate-600">
                <Camera className="w-5 h-5 opacity-30" />
                <span className="text-[8px] font-semibold mt-1">Pending Capture</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default EmployeeDashboard;
