import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, leaveAPI } from '../services/api';
import { LeaveRequest } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle
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
  Legend
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const ATTENDANCE_COLORS: Record<string, string> = {
  present: '#10b981', // emerald
  late: '#f59e0b',    // amber
  absent: '#ef4444',  // red
};

interface HRDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  notMarked: number;
  pendingLeaveApprovals: number;
}

const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}> = ({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#484f58] transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center border border-current opacity-90`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
    <p className="text-xs font-medium text-white mb-0.5">{label}</p>
    <p className="text-[10px] text-slate-500">{sub}</p>
  </div>
);

const HRDashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [departmentData, setDepartmentData] = useState<{ name: string; employeeCount: number }[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ _id: string; count: number }[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await dashboardAPI.getHr();
      const data = res.data?.data;
      setStats(data?.stats || null);
      setDepartmentData(data?.departmentBreakdown || []);
      setAttendanceStats(data?.attendanceStats || []);
    } catch (err) {
      console.error('HR Dashboard fetch error:', err);
      toast.error('Failed to sync HR dashboard data.');
    }

    try {
      const leavesRes = await leaveAPI.list({ limit: 100 });
      const leavesData = leavesRes.data?.data?.leaves || leavesRes.data?.data || [];
      const pending = leavesData.filter((l: LeaveRequest) => l.status === 'pending');
      setPendingLeaves(pending);
    } catch (err) {
      console.error('Dashboard pending leaves fetch error:', err);
    }

    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#0d1117] rounded-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-slate-400 text-sm">Loading HR Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      <Toaster position="top-right" />

      {/* ════════ HEADER ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg relative overflow-hidden mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-500" />
            Human Resources Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Welcome back, <span className="text-emerald-400 font-semibold">{user?.name}</span> · {tenant?.name || 'Company'}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#21262d] border border-[#30363d] hover:border-slate-500 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* ════════ STAT CARDS ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Employees"
          value={stats?.activeEmployees || 0}
          sub={`Out of ${stats?.totalEmployees || 0} registered`}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/15 text-blue-500"
        />
        <StatCard
          label="Present Today"
          value={stats?.todayPresent || 0}
          sub="Punched in successfully"
          icon={UserCheck}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/15 text-emerald-500"
        />
        <StatCard
          label="Late Check-ins"
          value={stats?.todayLate || 0}
          sub="Missed shift start time"
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/15 text-amber-500"
        />
        <StatCard
          label="Absent Today"
          value={stats?.todayAbsent || 0}
          sub="No punch-in recorded"
          icon={UserX}
          iconColor="text-red-500"
          iconBg="bg-red-500/15 text-red-500"
        />
        <StatCard
          label="Not Marked"
          value={stats?.notMarked || 0}
          sub="Yet to start shift"
          icon={AlertCircle}
          iconColor="text-slate-400"
          iconBg="bg-slate-500/15 text-slate-400"
        />
        <StatCard
          label="Pending Leaves"
          value={stats?.pendingLeaveApprovals || pendingLeaves.length || 0}
          sub="Require HR review"
          icon={CalendarCheck}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/15 text-purple-500"
        />
      </div>

      {/* ════════ CHARTS ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Department Breakdown */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Department Breakdown
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Headcount distribution across departments</p>
          </div>
          <div className="h-64 relative flex justify-center items-center">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    dataKey="employeeCount"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={3}
                  >
                    {departmentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No department data available.</p>
            )}
          </div>
        </div>

        {/* Attendance Breakdown (Bar Chart) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Today's Attendance Overview
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Daily attendance tracking</p>
          </div>
          <div className="h-64">
            {attendanceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                  <XAxis dataKey="_id" stroke="#64748b" fontSize={10} tickLine={false} style={{ textTransform: 'capitalize' }} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                    formatter={(val) => [val, 'Count']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {attendanceStats.map((entry, idx) => (
                      <Cell key={idx} fill={ATTENDANCE_COLORS[entry._id] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                 <p className="text-xs text-slate-500">No attendance records today.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ════════ PENDING LEAVES ════════ */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <CalendarCheck className="w-4.5 h-4.5 text-purple-400" /> Pending Leave Requests
            </h3>
            <p className="text-[10px] text-slate-500">Review and manage employee leave applications</p>
          </div>
          <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full border border-purple-500/20">
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

    </div>
  );
};

export default HRDashboard;
