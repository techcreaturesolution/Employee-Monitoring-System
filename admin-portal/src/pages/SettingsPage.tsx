import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Save,
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Mail,
  Clock,
  Monitor,
  Eye,
  Bell,
  Globe,
  Lock,
  Moon,
  Sun
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  // State for Admin Settings
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
    enableGeofencing: false,
    officeLocations: [] as Array<{ name: string; latitude: number; longitude: number; radiusMeters: number }>,
    mobileLocationInterval: 15,
    requireLocationForPunch: false,
  });

  // State for Employee Settings (saved in localStorage or mock database)
  const [employeeSettings, setEmployeeSettings] = useState({
    theme: 'dark',
    language: 'en',
    notifyTasks: true,
    notifyAttendance: true,
    notifySystem: false,
    notifyManagerMessages: true,
    privacyTelemetryReport: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Determine active tab based on role
  const defaultTab = isAdmin ? 'profile' : 'theme';
  const activeTab = searchParams.get('tab') || defaultTab;

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const res = await settingsAPI.get();
          const data = res.data.data;
          setCompany(data.company || { name: '', email: '', phone: '', domain: '' });
          setMonitoring(data.monitoring || {
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
            enableGeofencing: false,
            officeLocations: [],
            mobileLocationInterval: 15,
            requireLocationForPunch: false,
          });
        } else {
          // Load Employee Settings
          const stored = localStorage.getItem(`ems_emp_settings_${user?.id}`);
          if (stored) {
            setEmployeeSettings(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchSettings();
    }
  }, [user, isAdmin]);

  const handleSaveAdmin = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ company, monitoring });
      toast.success('Company settings saved successfully');
    } catch (error) {
      toast.error('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployee = () => {
    setSaving(true);
    try {
      localStorage.setItem(`ems_emp_settings_${user?.id}`, JSON.stringify(employeeSettings));
      
      // If theme changed, apply it
      const root = document.documentElement;
      const body = document.body;
      if (employeeSettings.theme === 'light') {
        root.classList.add('light-theme');
        body.classList.add('light-theme');
        localStorage.setItem('ems_theme', 'light');
      } else {
        root.classList.remove('light-theme');
        body.classList.remove('light-theme');
        localStorage.setItem('ems_theme', 'dark');
      }
      
      toast.success('Your preferences have been saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-slate-400 text-sm">Loading Settings...</p>
      </div>
    );
  }

  // ════════ EMPLOYEE SETTINGS RENDERING ════════
  if (!isAdmin) {
    return (
      <div className="bg-[#0d1117] min-h-full text-white space-y-6">
        <Toaster position="top-right" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <SettingsIcon className="w-5.5 h-5.5 text-blue-500" /> My Preferences
            </h1>
            <p className="text-xs text-slate-400">Configure theme interfaces, regional languages, notifications, and privacy details</p>
          </div>
          <button
            onClick={handleSaveEmployee}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'theme', label: 'Theme & Aesthetics', icon: Moon },
            { id: 'notifications', label: 'Alert Toggles', icon: Bell },
            { id: 'language', label: 'Language & Locale', icon: Globe },
            { id: 'privacy', label: 'Privacy & Data Telemetry', icon: Lock }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
          
          {/* 1. Theme Settings */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Visual Theme Settings</h3>
                <p className="text-xs text-slate-400 mb-4">Choose your preferred style for the employee dashboard portal</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setEmployeeSettings({ ...employeeSettings, theme: 'dark' })}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all ${
                      employeeSettings.theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/5 text-blue-400'
                        : 'border-[#30363d] bg-[#0d1117] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Moon className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold">Dark Mode</span>
                    <span className="text-[10px] text-slate-500 mt-1">Easier on the eyes in low light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeSettings({ ...employeeSettings, theme: 'light' })}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border transition-all ${
                      employeeSettings.theme === 'light'
                        ? 'border-blue-500 bg-blue-500/5 text-blue-400'
                        : 'border-[#30363d] bg-[#0d1117] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Sun className="w-8 h-8 mb-2 text-yellow-500" />
                    <span className="text-xs font-bold">Light Mode</span>
                    <span className="text-[10px] text-slate-500 mt-1">Clean and high contrast</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Alert Notifications Preference</h3>
                <p className="text-xs text-slate-400 mb-4">Select which browser push alerts or dashboard notifications you want to receive</p>
                
                <div className="space-y-3 divide-y divide-[#21262d]">
                  {[
                    { key: 'notifyTasks', label: 'Task Notifications', desc: 'Alert when a manager assigns you a task or changes its deadline' },
                    { key: 'notifyAttendance', label: 'Attendance Alerts', desc: 'Reminders when you forget to punch in or start/end break sessions' },
                    { key: 'notifySystem', label: 'System Notifications', desc: 'Alerts relating to agent key syncs, connection status, or disk capacities' },
                    { key: 'notifyManagerMessages', label: 'Manager Messages', desc: 'Instant desktop message notifications from your team lead or administrator' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3.5 first:pt-0">
                      <div className="pr-4">
                        <span className="text-xs font-semibold text-slate-200 block">{item.label}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{item.desc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmployeeSettings({ ...employeeSettings, [item.key]: !employeeSettings[item.key as keyof typeof employeeSettings] })}
                        className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors ${
                          employeeSettings[item.key as keyof typeof employeeSettings] ? 'bg-blue-600' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${employeeSettings[item.key as keyof typeof employeeSettings] ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Language Settings */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Language & Regional Settings</h3>
                <p className="text-xs text-slate-400 mb-4">Choose your preferred display language for UI labels, charts, and date formatting</p>
                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Select Language</label>
                  <select
                    value={employeeSettings.language}
                    onChange={(e) => setEmployeeSettings({ ...employeeSettings, language: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="en">English (United States)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" /> Transparency & Data Privacy Details
                </h3>
                <p className="text-xs text-slate-400 mb-4">This portal uses a desktop client. Below is a breakdown of active telemetry rules set by your company:</p>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4.5 space-y-3.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Active App & URL Logs</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Logs the process name and active window title during shift hours. It does NOT log key content or raw keyboard strokes.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Desktop screenshots</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Captured at random intervals averaging every 10 minutes. If blur rules are active, screenshots are blurred server-side before storage.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-bold text-white text-red-400">Webcam & Keystroke Input</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Completely disabled. The EMS Agent never activates webcams, audio recorders, or captures password input fields.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5 border-t border-[#21262d] mt-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Transparency Telemetry Logs</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Send weekly summary telemetry logs directly to your registered email</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmployeeSettings({ ...employeeSettings, privacyTelemetryReport: !employeeSettings.privacyTelemetryReport })}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors ${
                      employeeSettings.privacyTelemetryReport ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${employeeSettings.privacyTelemetryReport ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ════════ COMPANY ADMIN SETTINGS RENDERING ════════
  return (
    <div className="bg-[#0d1117] min-h-full text-white space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5.5 h-5.5 text-blue-500" /> Company Settings
        </h1>
        <button
          onClick={handleSaveAdmin}
          disabled={saving}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Company Profile', icon: SettingsIcon },
          { id: 'hours', label: 'Working Hours', icon: Clock },
          { id: 'frequency', label: 'Screenshot Settings', icon: Monitor },
          { id: 'rules', label: 'Tracking Rules', icon: Eye },
          { id: 'holidays', label: 'Holidays List', icon: Calendar },
          { id: 'email', label: 'Email Configuration', icon: Mail }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-blue-500" /> Company Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Company Name</label>
                <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Domain</label>
                <input type="text" value={company.domain} onChange={(e) => setCompany({ ...company, domain: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Working Hours & timezone
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work Start</label>
                <input type="time" value={monitoring.workStartTime} onChange={(e) => setMonitoring({ ...monitoring, workStartTime: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work End</label>
                <input type="time" value={monitoring.workEndTime} onChange={(e) => setMonitoring({ ...monitoring, workEndTime: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Timezone</label>
              <select value={monitoring.timezone} onChange={(e) => setMonitoring({ ...monitoring, timezone: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'frequency' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" /> Screenshot settings
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Screenshot Interval (minutes)</label>
              <input type="number" value={monitoring.screenshotInterval} onChange={(e) => setMonitoring({ ...monitoring, screenshotInterval: Number(e.target.value) })} min={1} max={60} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[#30363d] mt-2">
              <span className="text-xs text-slate-300">Blur screenshots for privacy</span>
              <button
                type="button"
                onClick={() => setMonitoring({ ...monitoring, blurScreenshots: !monitoring.blurScreenshots })}
                className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${
                  monitoring.blurScreenshots ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${monitoring.blurScreenshots ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Tracking Rules</h3>
              <div className="space-y-3">
                {[
                  { key: 'trackApps', label: 'Track Applications' },
                  { key: 'trackUrls', label: 'Track URLs' },
                  { key: 'allowManualPunch', label: 'Allow Manual Punch' },
                  { key: 'autoStopTracking', label: 'Auto Stop Tracking' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-[#30363d] last:border-0">
                    <span className="text-xs text-slate-300">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setMonitoring({ ...monitoring, [item.key]: !monitoring[item.key as keyof typeof monitoring] })}
                      className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${
                        monitoring[item.key as keyof typeof monitoring] ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${monitoring[item.key as keyof typeof monitoring] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#30363d] pt-4 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" /> Geo-Location & Geofencing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-300">Enable Geofencing</span>
                  <button
                    type="button"
                    onClick={() => setMonitoring({ ...monitoring, enableGeofencing: !monitoring.enableGeofencing })}
                    className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${
                      monitoring.enableGeofencing ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${monitoring.enableGeofencing ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-300">Require Location for Punch</span>
                  <button
                    type="button"
                    onClick={() => setMonitoring({ ...monitoring, requireLocationForPunch: !monitoring.requireLocationForPunch })}
                    className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${
                      monitoring.requireLocationForPunch ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${monitoring.requireLocationForPunch ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Office Locations */}
              <div className="mt-6 pt-4 border-t border-[#30363d]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-200">Office Geofence Locations</h4>
                  <button
                    type="button"
                    onClick={() => setMonitoring({
                      ...monitoring,
                      officeLocations: [...monitoring.officeLocations, { name: '', latitude: 0, longitude: 0, radiusMeters: 100 }]
                    })}
                    className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-2 py-1 rounded"
                  >
                    <Plus className="w-3 h-3" /> Add Location
                  </button>
                </div>
                
                {monitoring.officeLocations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No office locations defined. Geofencing will not work.</p>
                ) : (
                  <div className="space-y-3">
                    {monitoring.officeLocations.map((loc, idx) => (
                      <div key={idx} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="text-xs font-semibold text-slate-300">Location #{idx + 1}</h5>
                          <button
                            type="button"
                            onClick={() => {
                              const newLocs = [...monitoring.officeLocations];
                              newLocs.splice(idx, 1);
                              setMonitoring({ ...monitoring, officeLocations: newLocs });
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase mb-1">Name</label>
                            <input
                              type="text"
                              value={loc.name}
                              onChange={(e) => {
                                const newLocs = [...monitoring.officeLocations];
                                newLocs[idx].name = e.target.value;
                                setMonitoring({ ...monitoring, officeLocations: newLocs });
                              }}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white"
                              placeholder="HQ Office"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase mb-1">Latitude</label>
                            <input
                              type="number"
                              step="any"
                              value={loc.latitude}
                              onChange={(e) => {
                                const newLocs = [...monitoring.officeLocations];
                                newLocs[idx].latitude = parseFloat(e.target.value) || 0;
                                setMonitoring({ ...monitoring, officeLocations: newLocs });
                              }}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white"
                              placeholder="0.0000"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase mb-1">Longitude</label>
                            <input
                              type="number"
                              step="any"
                              value={loc.longitude}
                              onChange={(e) => {
                                const newLocs = [...monitoring.officeLocations];
                                newLocs[idx].longitude = parseFloat(e.target.value) || 0;
                                setMonitoring({ ...monitoring, officeLocations: newLocs });
                              }}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white"
                              placeholder="0.0000"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase mb-1">Radius (m)</label>
                            <input
                              type="number"
                              value={loc.radiusMeters}
                              onChange={(e) => {
                                const newLocs = [...monitoring.officeLocations];
                                newLocs[idx].radiusMeters = parseInt(e.target.value) || 100;
                                setMonitoring({ ...monitoring, officeLocations: newLocs });
                              }}
                              className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white"
                              placeholder="100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" /> Holidays List (2026)
            </h3>
            <div className="space-y-2">
              {[
                { name: 'New Year Day', date: '2026-01-01' },
                { name: 'Independence Day', date: '2026-08-15' },
                { name: 'Christmas Day', date: '2026-12-25' }
              ].map((h, i) => (
                <div key={i} className="flex justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
                  <span className="text-xs font-semibold text-slate-200">{h.name}</span>
                  <span className="text-xs text-slate-500 font-mono font-bold">{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" /> Email Settings & Relay
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SMTP Server Host</label>
                <input type="text" placeholder="smtp.gmail.com" className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-750" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SMTP Port</label>
                <input type="number" placeholder="587" className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-750" />
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => toast.success('SMTP Test Email Sent!')}
                  className="px-4 py-2 border border-[#30363d] text-slate-300 text-xs font-bold rounded-lg hover:bg-[#21262d] transition-colors cursor-pointer"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
