import React, { useEffect, useState } from 'react';
import { locationAPI } from '../services/api';
import { LiveEmployeeLocation, LocationLog as LocationLogType } from '../types';
import { MapPin, Navigation, RefreshCw, Wifi, WifiOff, Home, Building2, Briefcase, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const workModeConfig = {
  office: { label: 'Office', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  wfh: { label: 'Work From Home', color: 'bg-green-100 text-green-700', icon: Home },
  field: { label: 'Field', color: 'bg-orange-100 text-orange-700', icon: Briefcase },
};

const LocationTracker: React.FC = () => {
  const [liveLocations, setLiveLocations] = useState<LiveEmployeeLocation[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [trail, setTrail] = useState<LocationLogType[]>([]);
  const [trailDate, setTrailDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'live' | 'history'>('live');

  const fetchLive = async () => {
    try {
      setRefreshing(true);
      const res = await locationAPI.getLive();
      setLiveLocations(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch live locations:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchTrail = async () => {
    if (!selectedEmployee || !trailDate) return;
    try {
      const res = await locationAPI.getTrail({ userId: selectedEmployee, date: trailDate });
      setTrail(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch location trail');
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedEmployee && trailDate) {
      fetchTrail();
    }
  }, [selectedEmployee, trailDate]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Location Tracker</h1>
          <p className="text-sm text-slate-500">Track employee locations in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('live')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                view === 'live' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500'
              }`}
            >
              Live View
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                view === 'history' ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500'
              }`}
            >
              Trail History
            </button>
          </div>
          <button
            onClick={fetchLive}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {view === 'live' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2.5 rounded-lg">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{liveLocations.length}</p>
                  <p className="text-xs text-slate-500">Online with Location</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2.5 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {liveLocations.filter((e) => e.workMode === 'office').length}
                  </p>
                  <p className="text-xs text-slate-500">In Office</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2.5 rounded-lg">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {liveLocations.filter((e) => e.workMode === 'field').length}
                  </p>
                  <p className="text-xs text-slate-500">In Field</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Live Employee Locations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Work Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Coordinates</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Updated</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {liveLocations.map((emp) => {
                    const mode = workModeConfig[emp.workMode] || workModeConfig.office;
                    const ModeIcon = mode.icon;
                    return (
                      <tr key={emp.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{emp.department || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${mode.color}`}>
                            <ModeIcon className="w-3 h-3" />
                            {mode.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500" />
                            <span className="text-sm text-slate-600">
                              {emp.location?.address || 'GPS location recorded'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.google.com/maps?q=${emp.location?.latitude},${emp.location?.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            {emp.location?.latitude?.toFixed(5)}, {emp.location?.longitude?.toFixed(5)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {formatRelativeTime(emp.location?.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {emp.isOnline ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <Wifi className="w-3 h-3" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                              <WifiOff className="w-3 h-3" /> Offline
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {liveLocations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No employees with active location tracking
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Location Trail</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm min-w-[200px]"
                >
                  <option value="">Select Employee</option>
                  {liveLocations.map((e) => (
                    <option key={e.userId} value={e.userId}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={trailDate}
                  onChange={(e) => setTrailDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchTrail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Load Trail
                </button>
              </div>
            </div>

            {trail.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{trail.length} location points recorded</p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {trail.map((point, index) => (
                    <div
                      key={point._id}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${point.isInsideGeofence ? 'bg-green-500' : 'bg-orange-500'}`} />
                        {index < trail.length - 1 && (
                          <div className="w-0.5 h-8 bg-slate-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-sm font-medium">{formatTime(point.timestamp)}</span>
                            {point.isInsideGeofence && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">In Office</span>
                            )}
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Map
                          </a>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {point.address || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
                          {point.accuracy > 0 && ` (accuracy: ${point.accuracy.toFixed(0)}m)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedEmployee ? (
              <p className="text-slate-400 text-center py-8">No location data for selected date</p>
            ) : (
              <p className="text-slate-400 text-center py-8">Select an employee to view their location trail</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;
