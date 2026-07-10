import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Database,
  Cpu,
  Terminal,
  AlertTriangle,
  RefreshCw,
  Clock,
  HardDrive,
  Network,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { systemAPI } from '../services/api';

interface LogItem {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  service: string;
  message: string;
}

const levelColors: Record<string, string> = {
  error: 'bg-red-500/10 text-red-400 border border-red-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
};

const SystemMonitor: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [cpuUsage, setCpuUsage] = useState(23);
  const [memoryUsage, setMemoryUsage] = useState(58);
  const [dbLatency, setDbLatency] = useState(1.2);
  const [apiRpm, setApiRpm] = useState(480);
  const [cpuHistory, setCpuHistory] = useState<{ time: string; value: number }[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<{ time: string; value: number }[]>([]);

  const [logs, setLogs] = useState<LogItem[]>([
    { id: 'LOG-001', timestamp: '17:10:45', level: 'error', service: 'AUTH-SERVICE', message: 'Failed database connection handshake on pool-4' },
    { id: 'LOG-002', timestamp: '17:09:20', level: 'warning', service: 'SCREENSHOT-WORKER', message: 'Payload size exceeded 5MB threshold on tenant-3' },
    { id: 'LOG-003', timestamp: '17:08:11', level: 'info', service: 'SYNC-SERVICE', message: 'Successfully synced 42 screenshot assets to cloud storage bucket' },
    { id: 'LOG-004', timestamp: '17:05:00', level: 'warning', service: 'API-GATEWAY', message: 'Rate limit threshold triggered for IP 192.168.1.144' },
    { id: 'LOG-005', timestamp: '17:01:23', level: 'error', service: 'GEOFENCE-SERVICE', message: 'API Call failure to Google Maps geocoding client' },
  ]);

  // Real-time polling
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await systemAPI.getHealth();
        const data = res.data?.data;
        if (data?.system) {
          const sys = data.system;
          setCpuUsage(sys.cpuUsage);
          setMemoryUsage(sys.memoryUsage);
          // Simulate the ones not provided by simple health endpoint
          setDbLatency(Number((Math.max(0.5, Math.min(5, dbLatency + (Math.random() - 0.5) * 0.4))).toFixed(1)));
          setApiRpm(Math.max(300, Math.min(800, apiRpm + Math.round((Math.random() - 0.5) * 30))));
          
          setLastUpdated(new Date());

          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setCpuHistory(prev => [...prev.slice(-14), { time: timeStr, value: sys.cpuUsage }]);
          setMemoryHistory(prev => [...prev.slice(-14), { time: timeStr, value: sys.memoryUsage }]);
        }
      } catch (error) {
        console.error('Failed to fetch health check', error);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, [dbLatency, apiRpm]);

  // Initial history setup
  useEffect(() => {
    const initialCpu = Array.from({ length: 15 }, (_, i) => ({
      time: new Date(Date.now() - (15 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: 0,
    }));
    const initialMem = Array.from({ length: 15 }, (_, i) => ({
      time: new Date(Date.now() - (15 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: 0,
    }));
    setCpuHistory(initialCpu);
    setMemoryHistory(initialMem);
  }, []);

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Server className="w-5 h-5 text-emerald-400" />
            System Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time health status, api performance metric analysis, and error logs</p>
        </div>
        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] px-3 py-2 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          <span>Last sync: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">CPU Usage</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">{cpuUsage}%</p>
          </div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Memory Usage</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">{memoryUsage}%</p>
          </div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Database Latency</p>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{dbLatency}ms</p>
          </div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Network className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">API Requests</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">{apiRpm} RPM</p>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* CPU Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-white">CPU Utilisation History</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cpuHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fill="url(#cpuGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-semibold text-white">Memory Allocation History</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={memoryHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={1.5} fill="url(#memGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Storage & Error Logs Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage usage */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white">Storage Utilization</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center py-6">
              <p className="text-3xl font-extrabold text-white font-mono">1.2 TB</p>
              <p className="text-[10px] text-slate-500 mt-1">Used of 2.0 TB Allocated Storage</p>
            </div>
            <div className="w-full h-3 bg-[#0d1117] border border-[#30363d] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
            </div>
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Database Data</span>
                <span className="font-semibold text-white">245 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Screenshot Assets</span>
                <span className="font-semibold text-white">890 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Application Logs</span>
                <span className="font-semibold text-white">65 GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Terminal Log Stream */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white">Live System Logs</h3>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Streaming Live
            </span>
          </div>

          <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 font-mono text-[11px] leading-relaxed space-y-2.5 overflow-y-auto max-h-[190px]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5">
                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0 uppercase tracking-wider ${levelColors[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-blue-400 shrink-0">{log.service}:</span>
                <p className="text-slate-300 break-words">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
