import React, { useEffect, useState } from 'react';
import { activityAPI, employeeAPI } from '../services/api';
import { ActivityLog, User } from '../types';
import { Activity, Monitor, Globe, Clock, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<{ _id: string; totalMinutes: number; count: number }[]>([]);
  const [topApps, setTopApps] = useState<{ _id: string; totalMinutes: number; category: string }[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.list({ limit: 100 });
      setEmployees(res.data.data.employees || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50 };
      const summaryParams: Record<string, string> = {};

      if (selectedUser) {
        params.userId = selectedUser;
        summaryParams.userId = selectedUser;
      }
      if (startDate) {
        params.startDate = startDate;
        summaryParams.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
        summaryParams.endDate = endDate;
      }
      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const [logsRes, summaryRes] = await Promise.all([
        activityAPI.getLogs(params),
        activityAPI.getSummary(summaryParams),
      ]);
      setLogs(logsRes.data.data.logs || []);
      setSummary(summaryRes.data.data.summary || []);
      setTopApps(summaryRes.data.data.topApps || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedUser, startDate, endDate, categoryFilter]);

  const categoryColors: Record<string, string> = {
    productive: 'bg-green-100 text-green-700',
    neutral: 'bg-yellow-100 text-yellow-700',
    unproductive: 'bg-red-100 text-red-700',
  };

  const barColors: Record<string, string> = {
    productive: '#22c55e',
    neutral: '#eab308',
    unproductive: '#ef4444',
  };

  const formatMinutes = (totalMins: number) => {
    const rounded = Math.round(totalMins);
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6 text-blue-500" /> Activity Tracking
      </h1>

      {/* Filters Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filters:</span>
        </div>
        <div>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => {
              const empId = emp.id || (emp as any)._id;
              return (
                <option key={empId} value={empId}>
                  {emp.name}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Categories</option>
            <option value="productive">Productive</option>
            <option value="neutral">Neutral</option>
            <option value="unproductive">Unproductive</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        {(selectedUser || startDate || endDate || categoryFilter) && (
          <button
            onClick={() => {
              setSelectedUser('');
              setStartDate('');
              setEndDate('');
              setCategoryFilter('');
            }}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summary.map((item) => (
          <div key={item._id} className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 capitalize">{item._id || 'Unknown'}</p>
                <p className="text-2xl font-bold mt-1">{formatMinutes(item.totalMinutes)}</p>
                <p className="text-xs text-slate-400">{item.count} activities</p>
              </div>
              <div className={`w-4 h-4 rounded-full ${
                item._id === 'productive' ? 'bg-green-500' :
                item._id === 'neutral' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
          </div>
        ))}
      </div>

      {topApps.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-purple-500" /> Top Applications
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topApps} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="_id" type="category" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="totalMinutes"
                radius={[0, 4, 4, 0]}
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Application</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Window Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                    {typeof log.userId === 'object' ? (log.userId as any).name : 'Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       {log.url ? <Globe className="w-4 h-4 text-blue-500" /> : <Monitor className="w-4 h-4 text-slate-400" />}
                       <span className="text-sm font-medium">{log.appName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.windowTitle || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {log.durationMinutes}m
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[log.category] || categoryColors.neutral}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(log.startTime).toLocaleString('en-IN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No activity data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
