import React, { useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';
<<<<<<< HEAD
import { Settings, Save } from 'lucide-react';
=======
import { Settings, Save, MapPin, Plus, Trash2 } from 'lucide-react';
>>>>>>> origin/main
import toast, { Toaster } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const [company, setCompany] = useState({ name: '', email: '', phone: '', domain: '' });
  const [monitoring, setMonitoring] = useState({
<<<<<<< HEAD
    screenshotInterval: 2,
=======
    screenshotInterval: 10,
>>>>>>> origin/main
    trackApps: true,
    trackUrls: true,
    blurScreenshots: false,
    workStartTime: '09:00',
    workEndTime: '18:00',
    timezone: 'Asia/Kolkata',
    allowManualPunch: true,
    autoStopTracking: true,
    idleTimeThreshold: 5,
<<<<<<< HEAD
=======
    enableGeofencing: false,
    officeLocations: [] as Array<{ name: string; latitude: number; longitude: number; radiusMeters: number }>,
    mobileLocationInterval: 15,
    requireLocationForPunch: false,
>>>>>>> origin/main
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.get();
        const data = res.data.data;
        setCompany(data.company);
        setMonitoring(data.monitoring);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ company, monitoring });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-500" /> Settings
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Domain</label>
              <input type="text" value={company.domain} onChange={(e) => setCompany({ ...company, domain: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Monitoring Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Screenshot Interval (minutes)</label>
              <input type="number" value={monitoring.screenshotInterval} onChange={(e) => setMonitoring({ ...monitoring, screenshotInterval: Number(e.target.value) })} min={1} max={60} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Work Start</label>
                <input type="time" value={monitoring.workStartTime} onChange={(e) => setMonitoring({ ...monitoring, workStartTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work End</label>
                <input type="time" value={monitoring.workEndTime} onChange={(e) => setMonitoring({ ...monitoring, workEndTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Idle Threshold (minutes)</label>
              <input type="number" value={monitoring.idleTimeThreshold} onChange={(e) => setMonitoring({ ...monitoring, idleTimeThreshold: Number(e.target.value) })} min={1} max={30} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-3">
              {[
                { key: 'trackApps', label: 'Track Applications' },
                { key: 'trackUrls', label: 'Track URLs' },
                { key: 'blurScreenshots', label: 'Blur Screenshots' },
                { key: 'allowManualPunch', label: 'Allow Manual Punch' },
                { key: 'autoStopTracking', label: 'Auto Stop Tracking' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <span className="text-sm">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => setMonitoring({ ...monitoring, [item.key]: !monitoring[item.key as keyof typeof monitoring] })}
<<<<<<< HEAD
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${monitoring[item.key as keyof typeof monitoring] ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${monitoring[item.key as keyof typeof monitoring] ? 'translate-x-6' : 'translate-x-1'
                        }`}
=======
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      monitoring[item.key as keyof typeof monitoring] ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        monitoring[item.key as keyof typeof monitoring] ? 'translate-x-6' : 'translate-x-1'
                      }`}
>>>>>>> origin/main
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
<<<<<<< HEAD
=======
        <div className="bg-white rounded-xl p-6 shadow-sm border col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Geo-Location & Geofencing
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Enable Geofencing</span>
                <button
                  type="button"
                  onClick={() => setMonitoring({ ...monitoring, enableGeofencing: !monitoring.enableGeofencing })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    monitoring.enableGeofencing ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    monitoring.enableGeofencing ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Require Location for Punch</span>
                <button
                  type="button"
                  onClick={() => setMonitoring({ ...monitoring, requireLocationForPunch: !monitoring.requireLocationForPunch })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    monitoring.requireLocationForPunch ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    monitoring.requireLocationForPunch ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Location Interval (min)</label>
                <input
                  type="number"
                  value={monitoring.mobileLocationInterval}
                  onChange={(e) => setMonitoring({ ...monitoring, mobileLocationInterval: Number(e.target.value) })}
                  min={5}
                  max={60}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Office Locations</h4>
                <button
                  onClick={() => setMonitoring({
                    ...monitoring,
                    officeLocations: [...monitoring.officeLocations, { name: '', latitude: 0, longitude: 0, radiusMeters: 200 }],
                  })}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-4 h-4" /> Add Location
                </button>
              </div>

              {monitoring.officeLocations.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">No office locations configured. Add one to enable geofencing.</p>
              )}

              <div className="space-y-3">
                {monitoring.officeLocations.map((loc, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={loc.name}
                          onChange={(e) => {
                            const updated = [...monitoring.officeLocations];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setMonitoring({ ...monitoring, officeLocations: updated });
                          }}
                          placeholder="Main Office"
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={loc.latitude}
                          onChange={(e) => {
                            const updated = [...monitoring.officeLocations];
                            updated[idx] = { ...updated[idx], latitude: Number(e.target.value) };
                            setMonitoring({ ...monitoring, officeLocations: updated });
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={loc.longitude}
                          onChange={(e) => {
                            const updated = [...monitoring.officeLocations];
                            updated[idx] = { ...updated[idx], longitude: Number(e.target.value) };
                            setMonitoring({ ...monitoring, officeLocations: updated });
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Radius (meters)</label>
                        <input
                          type="number"
                          value={loc.radiusMeters}
                          onChange={(e) => {
                            const updated = [...monitoring.officeLocations];
                            updated[idx] = { ...updated[idx], radiusMeters: Number(e.target.value) };
                            setMonitoring({ ...monitoring, officeLocations: updated });
                          }}
                          min={50}
                          max={5000}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const updated = monitoring.officeLocations.filter((_, i) => i !== idx);
                        setMonitoring({ ...monitoring, officeLocations: updated });
                      }}
                      className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
>>>>>>> origin/main
      </div>
    </div>
  );
};

export default SettingsPage;
