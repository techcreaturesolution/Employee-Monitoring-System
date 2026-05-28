import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { DashboardStats, Screenshot } from '../types';
import {
  Users,
  Clock,
  Camera,
  Wifi,
  UserCheck,
  UserX,
  TrendingUp,
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
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

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
                      src={ss.imageUrl}
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

      {!isAdmin && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">My Activity</h3>
          <p className="text-slate-500">
            Use the sidebar to view your attendance, screenshots, and activity logs.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
