import React, { useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';
import { Settings, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const [company, setCompany] = useState({ name: '', email: '', phone: '', domain: '' });
  const [monitoring, setMonitoring] = useState({
    screenshotInterval: 10,
    trackApps: true,
    trackUrls: true,
    blurScreenshots: false,
    workStartTime: '09:00',
    workEndTime: '18:00',
    timezone: 'Asia/Kolkata',
    allowManualPunch: true,
    autoStopTracking: true,
    idleTimeThreshold: 5,
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      monitoring[item.key as keyof typeof monitoring] ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        monitoring[item.key as keyof typeof monitoring] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
