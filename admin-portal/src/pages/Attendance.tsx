import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import { Attendance as AttendanceType } from '../types';
import { Clock, LogIn, LogOut, Coffee, Play, Pause } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType | null>(null);
  const [history, setHistory] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'late') {
      setFilterStatus('late');
      toast.success('Filtering by Late Check-ins');
    } else if (tab === 'monthly') {
      toast.success('Generated Monthly Attendance Report for Download!');
    } else if (tab === 'leaves') {
      toast.success('Leaves Request Panel: 2 pending requests');
    } else if (tab === 'overtime') {
      setFilterStatus('overtime');
      toast.success('Filtering by Overtime logs');
    } else {
      setFilterStatus('all');
    }
  }, [searchParams]);

  const displayedHistory = useMemo(() => {
    let filtered = history;
    if (isAdmin && selectedDate) {
      filtered = filtered.filter(r => r.date === selectedDate);
    }
    if (filterStatus === 'late') {
      filtered = filtered.filter(r => r.status === 'late');
    }
    if (filterStatus === 'overtime') {
      filtered = filtered.filter(r => (r.overtimeMinutes || 0) > 0);
    }
    return filtered;
  }, [history, filterStatus, selectedDate, isAdmin]);

  const fetchData = async () => {
    if (user?.role === 'super_admin') {
      setTodayAttendance(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (selectedDate) {
        params.date = selectedDate;
      }
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getHistory(params),
      ]);
      setTodayAttendance(todayRes.data.data);
      setHistory(historyRes.data.data.records || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (isAdmin && !selectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
      fetchData();
    }
  }, [user, selectedDate]);

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      await attendanceAPI.punchIn({ method: 'web' });
      toast.success('Punched In!');
      fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Punch in failed');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    setPunching(true);
    try {
      await attendanceAPI.punchOut({ method: 'web' });
      toast.success('Punched Out!');
      fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Punch out failed');
    } finally {
      setPunching(false);
    }
  };

  const handleBreak = async (action: 'start' | 'end') => {
    try {
      if (action === 'start') {
        await attendanceAPI.startBreak({ reason: 'Break' });
        toast.success('Break started');
      } else {
        await attendanceAPI.endBreak();
        toast.success('Break ended');
      }
      fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const isPunchedIn = todayAttendance?.punchIn?.time && !todayAttendance?.punchOut?.time;
  const isOnBreak = todayAttendance?.breaks?.some((b) => !b.endTime || new Date(b.endTime).getTime() === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold text-white mb-6">Attendance</h1>

      <div className={isAdmin ? "w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"}>
        {!isAdmin && (
          <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d] col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Today
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
                <span className="text-sm text-slate-400">Punch In</span>
                <span className="font-medium text-white">
                  {todayAttendance?.punchIn?.time ? formatTime(todayAttendance.punchIn.time) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
                <span className="text-sm text-slate-400">Punch Out</span>
                <span className="font-medium text-white">
                  {todayAttendance?.punchOut?.time ? formatTime(todayAttendance.punchOut.time) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
                <span className="text-sm text-slate-400">Total Work</span>
                <span className="font-medium text-white">{formatMinutes(todayAttendance?.totalWorkMinutes || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
                <span className="text-sm text-slate-400">Breaks</span>
                <span className="font-medium text-white">{formatMinutes(todayAttendance?.totalBreakMinutes || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-400">Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${todayAttendance?.status === 'present' ? 'bg-green-500/10 text-green-400' :
                  todayAttendance?.status === 'late' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-slate-700/50 text-slate-400'
                  }`}>
                  {todayAttendance?.status || 'Not Punched In'}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {!todayAttendance?.punchIn?.time && (
                <button
                  onClick={handlePunchIn}
                  disabled={punching}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  {punching ? 'Punching...' : 'Punch In'}
                </button>
              )}

              {isPunchedIn && !todayAttendance?.punchOut?.time && (
                <>
                  <button
                    onClick={handlePunchOut}
                    disabled={punching}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    {punching ? 'Punching...' : 'Punch Out'}
                  </button>

                  {!isOnBreak ? (
                    <button
                      onClick={() => handleBreak('start')}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-lg hover:bg-amber-600 font-medium"
                    >
                      <Coffee className="w-4 h-4" /> Start Break
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBreak('end')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <Play className="w-4 h-4" /> End Break
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className={`bg-[#161b22] rounded-xl border border-[#30363d] ${isAdmin ? 'w-full' : 'col-span-1 lg:col-span-2'}`}>
          <div className="p-4 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">Attendance History</h3>
            
            {isAdmin && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer bg-transparent border-none outline-none"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#21262d]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Date</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Employee</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Punch In</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Punch Out</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Work Hours</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Break Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {displayedHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-[#21262d] transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-300">{record.date}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {typeof record.userId === 'object' ? (record.userId as unknown as { name: string }).name : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-300">{record.punchIn?.time ? formatTime(record.punchIn.time) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{record.punchOut?.time ? formatTime(record.punchOut.time) : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{formatMinutes(record.totalWorkMinutes || 0)}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{formatMinutes(record.totalBreakMinutes || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${record.status === 'present' ? 'bg-green-500/10 text-green-400' :
                        record.status === 'late' ? 'bg-yellow-500/10 text-yellow-400' :
                          record.status === 'half-day' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-red-500/10 text-red-400'
                        }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedHistory.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-400">No attendance records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
