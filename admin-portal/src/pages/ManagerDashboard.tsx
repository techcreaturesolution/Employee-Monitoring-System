import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, employeeAPI, projectAPI, taskAPI } from '../services/api';
import {
  Users,
  Briefcase,
  FolderOpen,
  CheckSquare,
  CalendarCheck,
  Activity,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  UserCheck,
  UserX,
  CheckCircle2,
  Hourglass,
  LayoutDashboard,
  AppWindow,
  Globe,
  Bell
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
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

/* ── Helpers ── */
const fmtMin = (m: number) => {
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

/* ── Stat Card Component ── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendVal?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  trendVal
}) => (
  <div className="bg-[#161b22]/90 backdrop-blur-md border border-[#30363d] rounded-xl p-4.5 hover:border-[#484f58] hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center border border-slate-700/50 shadow-inner`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      {trend && trendVal && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
          trend === 'down' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
          'bg-slate-500/10 text-slate-400 border border-slate-500/25'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-2.5 h-2.5" /> :
           trend === 'down' ? <ArrowDown className="w-2.5 h-2.5" /> : null}
          {trendVal}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-extrabold text-white tracking-tight mb-1">{value}</h3>
    <p className="text-xs font-semibold text-slate-200 mb-0.5">{label}</p>
    <p className="text-[10px] text-slate-500 font-medium">{sub}</p>
  </div>
);

const ManagerDashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  /* ── Live Data States ── */
  const [teamCount, setTeamCount] = useState(8);
  const [presentCount, setPresentCount] = useState(7);
  const [projectCount, setProjectCount] = useState(3);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [avgProductivity, setAvgProductivity] = useState(84);
  const [avgWorkingHours, setAvgWorkingHours] = useState('7h 48m');

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch team members count
      const empRes = await employeeAPI.list({ limit: 100 });
      const employees = empRes.data?.data?.employees || [];
      // Filter by department if manager is assigned to one
      const deptFiltered = user?.department 
        ? employees.filter((e: any) => e.department === user.department)
        : employees;
      
      setTeamCount(deptFiltered.length);

      // 2. Fetch projects count
      const projRes = await projectAPI.list();
      const projects = projRes.data?.data || [];
      setProjectCount(projects.filter((p: any) => p.status === 'active' || p.status === 'in-progress' || !p.status).length);

      // 3. Fetch tasks count
      const taskRes = await taskAPI.list();
      const tasks = taskRes.data?.data || [];
      const pending = tasks.filter((t: any) => !t.done).length;
      const completed = tasks.filter((t: any) => t.done).length;
      setPendingTasks(pending);
      setCompletedTasks(completed);

      // 4. Productivity and attendance calculations
      const statsRes = await dashboardAPI.getManager();
      const adminStats = statsRes.data?.data?.stats || statsRes.data?.data;
      if (adminStats) {
        const totalEmp = adminStats.totalEmployees || employees.length || 1;
        const todayPres = adminStats.todayPresentCount !== undefined ? adminStats.todayPresentCount : (adminStats.todayPresent || 0);
        // Adjust ratio for manager's team
        const ratio = deptFiltered.length / totalEmp;
        setPresentCount(Math.max(0, Math.round(todayPres * ratio)));
        setAvgProductivity(Math.round(adminStats.avgProductivity || 84));
      }
    } catch (err) {
      console.error('Backend API request failed in manager dashboard:', err);
      toast.error('Failed to sync manager dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const absentCount = teamCount - presentCount;

  /* ── 5 Charts Data ── */
  // 1. Weekly Attendance (Present vs Absent)
  const weeklyAttendanceData = useMemo(() => [
    { day: 'Mon', present: Math.max(1, Math.round(teamCount * 0.88)), absent: Math.max(0, teamCount - Math.round(teamCount * 0.88)) },
    { day: 'Tue', present: Math.max(1, Math.round(teamCount * 1.0)), absent: 0 },
    { day: 'Wed', present: Math.max(1, Math.round(teamCount * 0.75)), absent: Math.max(0, teamCount - Math.round(teamCount * 0.75)) },
    { day: 'Thu', present: Math.max(1, Math.round(teamCount * 0.88)), absent: Math.max(0, teamCount - Math.round(teamCount * 0.88)) },
    { day: 'Fri', present: Math.max(1, Math.round(teamCount * 0.95)), absent: Math.max(0, teamCount - Math.round(teamCount * 0.95)) },
  ], [teamCount]);


  // 3. Productivity Score (Daily Avg %)
  const productivityData = [
    { day: 'Mon', score: 81 },
    { day: 'Tue', score: 85 },
    { day: 'Wed', score: 79 },
    { day: 'Thu', score: 86 },
    { day: 'Fri', score: 84 },
  ];

  // 4. App Usage (Hours spent on top 5 apps)
  const appUsageData = [
    { name: 'VS Code', hours: 42, color: '#3b82f6' },
    { name: 'Chrome', hours: 28, color: '#10b981' },
    { name: 'Slack', hours: 15, color: '#f59e0b' },
    { name: 'Terminal', hours: 10, color: '#ef4444' },
    { name: 'Figma', hours: 8, color: '#8b5cf6' },
  ];

  // 5. Website Usage (Minutes spent on top 5 web domains)
  const websiteUsageData = [
    { name: 'github.com', value: 340, color: '#3b82f6' },
    { name: 'stackoverflow.com', value: 180, color: '#10b981' },
    { name: 'jira.com', value: 120, color: '#f59e0b' },
    { name: 'figma.com', value: 90, color: '#8b5cf6' },
    { name: 'google.com', value: 70, color: '#ef4444' },
  ];

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-full bg-[#0d1117] text-white space-y-6">
      {/* ════════ HEADER ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-500" />
            Manager Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Welcome back, <span className="text-blue-400 font-semibold">{user?.name}</span> · Department:{' '}
            <span className="text-slate-200 font-semibold">{user?.department || 'Engineering'}</span> · {fmtTime(now)}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#21262d] border border-[#30363d] hover:border-slate-500 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* ════════ 8 STAT CARDS ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          label="Total Team"
          value={teamCount}
          sub="Members assigned"
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10 text-blue-400 border-blue-500/20"
        />
        <StatCard
          label="Present Today"
          value={presentCount}
          sub="Punch-ins active"
          icon={UserCheck}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          trend="up"
          trendVal={`${Math.round((presentCount / teamCount) * 100)}% rate`}
        />
        <StatCard
          label="Absent Today"
          value={absentCount}
          sub="Missing punch-ins"
          icon={UserX}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10 text-rose-400 border-rose-500/20"
          trend={absentCount === 0 ? 'up' : 'down'}
          trendVal={absentCount === 0 ? 'Perfect' : `${absentCount} out`}
        />
        <StatCard
          label="Running Projects"
          value={projectCount}
          sub="Active monitoring"
          icon={FolderOpen}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10 text-purple-400 border-purple-500/20"
        />
        <StatCard
          label="Pending Tasks"
          value={pendingTasks}
          sub="In workflow"
          icon={CheckSquare}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10 text-amber-400 border-amber-500/20"
          trend="neutral"
          trendVal="Active"
        />
        <StatCard
          label="Completed Tasks"
          value={completedTasks}
          sub="Marked as done"
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        />
        <StatCard
          label="Avg Productivity"
          value={`${avgProductivity}%`}
          sub="Team efficiency"
          icon={TrendingUp}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          trend="up"
          trendVal="+2.4% vs lw"
        />
        <StatCard
          label="Avg Work Hours"
          value={avgWorkingHours}
          sub="Tracked hours"
          icon={Clock}
          iconColor="text-teal-400"
          iconBg="bg-teal-500/10 text-teal-400 border-teal-500/20"
          trend="up"
          trendVal="Optimum"
        />
      </div>

      {/* ════════ CHARTS SECTION ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance (Bar Chart) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-400" />
              Weekly Attendance
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Daily attendance distribution</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendanceData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="present" fill="#3b82f6" name="Present" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* Productivity (Area Chart) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Productivity Trend
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Daily average team productivity score (%)</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[50, 100]} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                />
                <Area type="monotone" dataKey="score" name="Productivity (%)" stroke="#22d3ee" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Usage (Horizontal Bar Chart) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AppWindow className="w-4 h-4 text-teal-400" />
              App Usage
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Top tools used by team members (Hours)</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={appUsageData}
                margin={{ top: 10, right: 5, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="hours" name="Hours Logged" radius={[0, 3, 3, 0]} maxBarSize={20}>
                  {appUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Website Usage (Donut Chart) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              Website Usage
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Time distribution on top websites (Minutes)</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 h-60">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={websiteUsageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {websiteUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-3">
              {websiteUsageData.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-300 font-medium truncate max-w-[120px]">{entry.name}</span>
                  </div>
                  <span className="text-white font-bold">{entry.value}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ FOOTER ════════ */}
      <div className="flex items-center justify-between bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 text-[10px] text-slate-500 font-semibold">
        <span>Tenant ID: {tenant?.id || 'tcs-tenant-01'} · Company: {tenant?.name || 'Tech Creature Solution'}</span>
        <div className="flex items-center gap-1.5 text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Manager Workspace Server Connected
        </div>
        <span>EMS Admin Portal v1.0.0</span>
      </div>
    </div>
  );
};

export default ManagerDashboard;
