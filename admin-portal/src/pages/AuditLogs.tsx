import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Trash2,
  Download,
  User,
  ShieldAlert,
  RefreshCw,
  Layers,
  ShieldCheck,
  UserX,
  Calendar,
  Building2,
  Monitor,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminPage from './SuperAdminPage';
import { getAuditLogs, clearAuditLogs, AuditLog } from '../services/auditLogger';

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load logs
  const fetchLogs = () => {
    const data = getAuditLogs();
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Compute metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.action === 'Admin Login').length;
    const companies = logs.filter(l => l.action === 'Company Created').length;
    const subChanges = logs.filter(l => l.action === 'Subscription Changed').length;
    const employeeDeletions = logs.filter(l => l.action === 'Employee Deleted').length;
    return { total, logins, companies, subChanges, employeeDeletions };
  }, [logs]);

  // Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      const matchesSearch = 
        log.actor.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.id.toLowerCase().includes(search.toLowerCase()) ||
        log.ipAddress.includes(search);

      // Action filter
      const matchesAction = filterAction === 'all' || log.action === filterAction;

      // Severity filter
      const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;

      // Date filter
      let matchesDate = true;
      if (filterDate !== 'all') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - logDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filterDate === 'today') {
          matchesDate = logDate.toDateString() === now.toDateString();
        } else if (filterDate === 'week') {
          matchesDate = diffDays <= 7;
        } else if (filterDate === 'month') {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesAction && matchesSeverity && matchesDate;
    });
  }, [logs, search, filterAction, filterSeverity, filterDate]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterAction, filterSeverity, filterDate]);

  // Clear handler
  const handleClear = () => {
    if (!window.confirm('Are you sure you want to clear all audit logs? This action is irreversible.')) {
      return;
    }
    clearAuditLogs();
    setLogs([]);
    toast.success('Audit logs cleared successfully');
  };

  // Export handlers
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs available to export');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ems_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Exported logs in JSON format');
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs available to export');
      return;
    }
    const headers = ['ID', 'Action', 'Actor', 'Details', 'Timestamp', 'IP Address', 'Device', 'Severity'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.actor,
      `"${log.details.replace(/"/g, '""')}"`,
      log.timestamp,
      log.ipAddress,
      log.device,
      log.severity
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `ems_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Exported logs in CSV format');
  };

  const getSeverityBadgeColor = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <SuperAdminPage
      title="Audit Logs"
      subtitle="Complete, tamper-evident log of all system and user operations"
      icon={FileText}
      accentColor="text-orange-400"
    >
      <div className="space-y-6">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Operations</p>
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.total}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">All recorded events</p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Admin Logins</p>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.logins}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Successful auth attempts</p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Companies Created</p>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.companies}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Tenants registered</p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Plan Changes</p>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.subChanges}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Subscriptions modified</p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-md col-span-2 md:col-span-4 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Employees Deleted</p>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stats.employeeDeletions}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Personnel deactivations</p>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by User, Description, IP, or Log ID..."
                className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Group */}
            <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="all">All Actions</option>
                <option value="Admin Login">Admin Login</option>
                <option value="Company Created">Company Created</option>
                <option value="Subscription Changed">Subscription Changed</option>
                <option value="Employee Deleted">Employee Deleted</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="success">Success (Green)</option>
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="danger">Danger (Red)</option>
              </select>

              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-[#30363d] pt-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Showing {filteredLogs.length} of {logs.length} operations</span>
              {(search || filterAction !== 'all' || filterSeverity !== 'all' || filterDate !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setFilterAction('all');
                    setFilterSeverity('all');
                    setFilterDate('all');
                  }}
                  className="ml-2 text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  Reset filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <div className="absolute right-0 bottom-full mb-1 bg-[#161b22] border border-[#30363d] rounded-xl shadow-xl py-1 w-28 hidden group-hover:block hover:block z-20">
                  <button onClick={handleExportCSV} className="w-full text-left px-3.5 py-1.5 text-[11px] text-slate-300 hover:bg-[#21262d] hover:text-white transition-colors">CSV Format</button>
                  <button onClick={handleExportJSON} className="w-full text-left px-3.5 py-1.5 text-[11px] text-slate-300 hover:bg-[#21262d] hover:text-white transition-colors">JSON Format</button>
                </div>
              </div>

              <button
                onClick={handleClear}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white text-xs font-semibold rounded-xl disabled:opacity-30 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Logs
              </button>
            </div>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#161b22]">
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-20">Log ID</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-24">Timestamp</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-36">Action</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-48">Actor</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-28">IP Address</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-36">Device / System</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] bg-[#0d1117]/30">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161b22]/60 transition-colors">
                    {/* Log ID */}
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-500">{log.id}</td>

                    {/* Timestamp */}
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      <div className="group relative cursor-default">
                        <span>{formatRelativeTime(log.timestamp)}</span>
                        <div className="absolute left-0 bottom-full mb-2 bg-[#21262d] border border-[#30363d] text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </td>

                    {/* Action Tag */}
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${getSeverityBadgeColor(log.severity)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="px-5 py-3.5 text-xs text-slate-200 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[170px]" title={log.actor}>
                          {log.actor}
                        </span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      <p className="line-clamp-2 max-w-[450px]" title={log.details}>
                        {log.details}
                      </p>
                    </td>

                    {/* IP Address */}
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{log.ipAddress}</td>

                    {/* Device / System */}
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-slate-600" />
                        <span>{log.device}</span>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Info className="w-10 h-10 text-slate-600 mb-2 opacity-50" />
                        <p className="text-sm font-semibold text-white">No audit logs found</p>
                        <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search queries or drop-down filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363d] bg-[#161b22]/30">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-300">
                  {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-300">{filteredLogs.length}</span> logs
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-[#0d1117] disabled:hover:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center text-xs text-slate-400 font-semibold px-2">
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-[#0d1117] disabled:hover:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminPage>
  );
};

export default AuditLogsPage;
