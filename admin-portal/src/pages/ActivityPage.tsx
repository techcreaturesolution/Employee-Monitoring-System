import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { activityAPI } from '../services/api';
import { ActivityLog } from '../types';
import { Activity, Monitor, Globe, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<{ _id: string; totalMinutes: number; count: number }[]>([]);
  const [topApps, setTopApps] = useState<{ _id: string; totalMinutes: number; category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'keyboard') {
      toast.success('Average Keyboard Activity: 62 keypresses/min (Active)');
    } else if (tab === 'mouse') {
      toast.success('Average Mouse Activity: 18 clicks/min (Active)');
    } else if (tab === 'idle') {
      toast.success('Average Idle Threshold: 10 mins (Active)');
    } else if (tab === 'reports') {
      navigate('/reports?tab=productivity');
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.role === 'super_admin') {
        setLogs([]);
        setSummary([]);
        setTopApps([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [logsRes, summaryRes] = await Promise.all([
          activityAPI.getLogs({ limit: 50 }),
          activityAPI.getSummary({}),
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
    if (user) {
      fetchData();
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6 text-blue-500" /> Activity Tracking
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summary.map((item) => (
          <div key={item._id} className="bg-[#161b22] rounded-xl p-5 border border-[#30363d]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 capitalize">{item._id || 'Unknown'}</p>
                <p className="text-2xl font-bold mt-1 text-white">{Math.round(item.totalMinutes / 60)}h {item.totalMinutes % 60}m</p>
                <p className="text-xs text-slate-500">{item.count} activities</p>
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
        <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d] mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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

      <div className="bg-[#161b22] rounded-xl border border-[#30363d]">
        <div className="p-4 border-b border-[#30363d]">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#21262d]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Application</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Window Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-[#21262d] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {log.url ? <Globe className="w-4 h-4 text-blue-400" /> : <Monitor className="w-4 h-4 text-slate-400" />}
                      <span className="text-sm font-medium text-white">{log.appName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">{log.windowTitle || '-'}</td>
                  <td className="px-4 py-3 text-sm text-white">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {log.durationMinutes}m
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.category === 'productive' ? 'bg-green-500/10 text-green-400' :
                      log.category === 'unproductive' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(log.startTime).toLocaleString('en-IN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No activity data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
