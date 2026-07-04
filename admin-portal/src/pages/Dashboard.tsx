import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, getFullImageUrl } from '../services/api';
import { DashboardStats, Screenshot } from '../types';
import {
  Users,
  Clock,
  Camera,
  Wifi,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Monitor,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<{ date: string; present: number }[]>([]);
  const [productivity, setProductivity] = useState<{ _id: string; totalMinutes: number }[]>([]);
  const [recentScreenshots, setRecentScreenshots] = useState<Screenshot[]>([]);
  const [employeeDashboard, setEmployeeDashboard] = useState<{
    todayAttendance: any;
    todayScreenshots: number;
    recentActivity: any[];
    weekAttendance: any[];
    productivityToday: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(() => 
    user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager',
    [user?.role]
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = isAdmin
          ? await dashboardAPI.getAdmin()
          : await dashboardAPI.getEmployee();
        const data = res.data.data;

        if (isAdmin) {
          setStats(data.stats);
          setAttendanceTrend(data.attendanceTrend || []);
          setProductivity(data.productivityBreakdown || []);
          setRecentScreenshots(data.recentScreenshots || []);
        } else {
          setEmployeeDashboard({
            todayAttendance: data.todayAttendance || null,
            todayScreenshots: data.todayScreenshots || 0,
            recentActivity: data.recentActivity || [],
            weekAttendance: data.weekAttendance || [],
            productivityToday: data.productivityToday || [],
          });
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500' },
        { label: 'Present Today', value: stats.todayPresent, icon: UserCheck, color: 'bg-green-500' },
        { label: 'Absent Today', value: stats.todayAbsent, icon: UserX, color: 'bg-red-500' },
        { label: "Today's Screenshots", value: stats.todayScreenshots, icon: Camera, color: 'bg-purple-500' },
        { label: 'Online Now', value: stats.onlineNow, icon: Wifi, color: 'bg-emerald-500' },
        { label: 'Active Employees', value: stats.activeEmployees, icon: TrendingUp, color: 'bg-orange-500' },
      ]
    : [];

  const pieData = productivity.map((p) => ({
    name: p._id || 'Unknown',
    value: p.totalMinutes,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-slate-500">Welcome back, {user?.name}</p>
      </div>

      {isAdmin && stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center gap-3">
                    <div className={`${card.color} p-2.5 rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                      <p className="text-xs text-slate-500">{card.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Attendance Trend (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Productivity Breakdown
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                  No activity data yet
                </div>
              )}
            </div>
          </div>

          {recentScreenshots.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-500" />
                Recent Screenshots
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentScreenshots.map((ss) => (
                  <div key={ss._id} className="relative group rounded-lg overflow-hidden border">
                    <img
                      src={getFullImageUrl(ss.imageUrl)}
                      alt={ss.windowTitle || 'Screenshot'}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                      <p className="truncate">{ss.activeApp || 'Unknown App'}</p>
                      <p className="text-slate-300">{new Date(ss.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isAdmin && employeeDashboard && (
        <>
          {/* Employee stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2.5 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {employeeDashboard.todayAttendance?.punchIn?.time
                      ? new Date(employeeDashboard.todayAttendance.punchIn.time).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Absent'}
                  </p>
                  <p className="text-xs text-slate-500">Punch In Time</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2.5 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {employeeDashboard.todayAttendance
                      ? `${Math.floor(employeeDashboard.todayAttendance.totalWorkMinutes / 60)}h ${
                          employeeDashboard.todayAttendance.totalWorkMinutes % 60
                        }m`
                      : '0h 0m'}
                  </p>
                  <p className="text-xs text-slate-500">Work Time Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2.5 rounded-lg">
                  <UserX className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {employeeDashboard.todayAttendance
                      ? `${Math.floor(employeeDashboard.todayAttendance.totalBreakMinutes / 60)}h ${
                          employeeDashboard.todayAttendance.totalBreakMinutes % 60
                        }m`
                      : '0h 0m'}
                  </p>
                  <p className="text-xs text-slate-500">Break Time Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2.5 rounded-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{employeeDashboard.todayScreenshots}</p>
                  <p className="text-xs text-slate-500">Screenshots Captured</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly attendance/hours chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                My Tracked Hours (Last 7 Days)
              </h3>
              {employeeDashboard.weekAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[...employeeDashboard.weekAttendance].reverse().map((att) => ({
                      date: att.date,
                      work: Number((att.totalWorkMinutes / 60).toFixed(1)),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis unit="h" />
                    <Tooltip formatter={(value) => [`${value} hours`]} />
                    <Bar dataKey="work" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                  No attendance history yet
                </div>
              )}
            </div>

            {/* Productivity breakdown pie */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Productivity Breakdown Today
              </h3>
              {employeeDashboard.productivityToday.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={employeeDashboard.productivityToday.map((p) => ({
                        name: p._id || 'Unknown',
                        value: p.totalMinutes,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {employeeDashboard.productivityToday.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} minutes`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                  No activity tracked today
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                My Recent Activity Logs
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Application</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Window Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeDashboard.recentActivity.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {log.url ? <Globe className="w-4 h-4 text-blue-500" /> : <Monitor className="w-4 h-4 text-slate-400" />}
                          <span className="text-sm font-medium">{log.appName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.windowTitle || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">{log.durationMinutes}m</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          log.category === 'productive' ? 'bg-green-100 text-green-700' :
                          log.category === 'neutral' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(log.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                  {employeeDashboard.recentActivity.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No recent activities recorded today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
