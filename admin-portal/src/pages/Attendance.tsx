import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import { Attendance as AttendanceType } from '../types';
import { Clock, LogIn, LogOut, Coffee, Play, Pause } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType | null>(null);
  const [history, setHistory] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const fetchData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getHistory({ limit: 30 }),
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
    fetchData();
  }, []);

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
    <div>
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Attendance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border col-span-1">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" /> Today
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-500">Punch In</span>
              <span className="font-medium">
                {todayAttendance?.punchIn?.time ? formatTime(todayAttendance.punchIn.time) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-500">Punch Out</span>
              <span className="font-medium">
                {todayAttendance?.punchOut?.time ? formatTime(todayAttendance.punchOut.time) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-500">Total Work</span>
              <span className="font-medium">{formatMinutes(todayAttendance?.totalWorkMinutes || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-500">Breaks</span>
              <span className="font-medium">{formatMinutes(todayAttendance?.totalBreakMinutes || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500">Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                todayAttendance?.status === 'present' ? 'bg-green-100 text-green-700' :
                todayAttendance?.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-500'
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

        <div className="bg-white rounded-xl shadow-sm border col-span-1 lg:col-span-2">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Attendance History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Punch In</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Punch Out</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Work Hours</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{record.date}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm">
                        {typeof record.userId === 'object' ? (record.userId as unknown as { name: string }).name : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">{record.punchIn?.time ? formatTime(record.punchIn.time) : '-'}</td>
                    <td className="px-4 py-3 text-sm">{record.punchOut?.time ? formatTime(record.punchOut.time) : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatMinutes(record.totalWorkMinutes || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        record.status === 'present' ? 'bg-green-100 text-green-700' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                        record.status === 'half-day' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No attendance records yet</td></tr>
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
