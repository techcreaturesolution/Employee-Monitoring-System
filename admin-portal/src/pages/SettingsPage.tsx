import React, { useEffect, useState } from 'react';
import { settingsAPI, subscriptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Save,
  MapPin,
  Plus,
  Trash2,
  CreditCard,
  Check,
  Zap,
  Calendar,
  Building,
  RefreshCw,
  AlertCircle,
  Lock,
  Shield,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: '₹999',
    period: 'month',
    description: 'Perfect for small teams looking for essential monitoring.',
    features: [
      'Up to 5 Employees included',
      '10-minute Screenshot Interval',
      'App & website activity tracking',
      'Basic reports & attendance logs',
      'Standard support response'
    ],
    color: 'border-blue-200 bg-blue-50/20 text-blue-700 hover:border-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800',
    iconColor: 'text-blue-500',
    popular: false
  },
  {
    id: 'business',
    name: 'Business Plan',
    price: '₹2,999',
    period: 'month',
    description: 'Advanced tracking, geofencing, and timeline analysis.',
    features: [
      'Up to 25 Employees included',
      '2-minute Screenshot Interval',
      'Live GPS map & track trails',
      'Geofencing & office attendance rules',
      'Full PDF & Excel exports',
      'Priority email & chat support'
    ],
    color: 'border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:border-indigo-400',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    iconColor: 'text-indigo-500',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: '₹9,999',
    period: 'month',
    description: 'Maximum capabilities for unlimited growth.',
    features: [
      'Unlimited Employees included',
      '1-minute Screenshot Interval',
      'Custom geofencing coordinates list',
      'API access & webhook events',
      'Dedicated Customer Success manager',
      'Custom report layouts & branding'
    ],
    color: 'border-violet-200 bg-violet-50/20 text-violet-700 hover:border-violet-400',
    badgeColor: 'bg-violet-100 text-violet-800',
    iconColor: 'text-violet-500',
    popular: false
  }
];

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const SettingsPage: React.FC = () => {
  const { tenant, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'billing'>('general');
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

  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal and checkout simulator state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<typeof PLANS[0] | null>(null);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchSettingsAndSub = async () => {
    try {
      const [settingsRes, subRes] = await Promise.all([
        settingsAPI.get(),
        subscriptionAPI.getStatus().catch(() => ({ data: { data: null } }))
      ]);
      const data = settingsRes.data.data;
      setCompany(data.company);
      setMonitoring(data.monitoring);
      setSubscription(subRes.data.data);
    } catch (error) {
      console.error('Error loading settings/subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndSub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ company, monitoring });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeClick = (plan: typeof PLANS[0]) => {
    setSelectedPlanForUpgrade(plan);
    setCardDetails({ number: '', name: '', expiry: '', cvv: '' });
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForUpgrade) return;

    setProcessingPayment(true);
    try {
      // 1. Create subscription via Backend API
      const res = await subscriptionAPI.create(selectedPlanForUpgrade.id);
      
      if (res.data.success) {
        const subData = res.data.data;
        const subId = subData.razorpaySubscriptionId;

        // 2. If it is NOT a mock subscription, launch Razorpay Checkout script overlay
        if (subId && !subId.startsWith('sub_mock_')) {
          const scriptLoaded = await loadRazorpayScript();
          if (scriptLoaded && (window as any).Razorpay) {
            const options = {
              key: subData.razorpayKeyId || 'rzp_test_placeholder',
              subscription_id: subId,
              name: 'Employee Monitoring System',
              description: `${selectedPlanForUpgrade.name} Upgrade`,
              handler: async function (response: any) {
                toast.success('Subscription completed successfully!');
                await refreshAuth();
                await fetchSettingsAndSub();
                setPaymentModalOpen(false);
                setProcessingPayment(false);
              },
              modal: {
                ondismiss: function () {
                  setProcessingPayment(false);
                }
              },
              prefill: {
                name: company.name || tenant?.name || '',
                email: company.email || tenant?.email || '',
              },
              theme: {
                color: '#4f46e5',
              },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
            return;
          }
        }

        // 3. Fallback to custom credit card simulator modal (for testing/development)
        setTimeout(async () => {
          toast.success(`Mock Payment verified for ${selectedPlanForUpgrade.name}!`);
          await refreshAuth();
          await fetchSettingsAndSub();
          setPaymentModalOpen(false);
          setProcessingPayment(false);
        }, 1800);
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      toast.error(error.response?.data?.message || 'Subscription processing failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleSandboxQuickPay = async () => {
    if (!selectedPlanForUpgrade) return;
    setProcessingPayment(true);
    try {
      const res = await subscriptionAPI.create(selectedPlanForUpgrade.id);
      if (res.data.success) {
        setTimeout(async () => {
          toast.success(`Quick Sandbox payment successful for ${selectedPlanForUpgrade.name}!`);
          await refreshAuth();
          await fetchSettingsAndSub();
          setPaymentModalOpen(false);
          setProcessingPayment(false);
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mock payment failed');
      setProcessingPayment(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getCardType = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNum)) return 'Mastercard';
    if (/^3[47]/.test(cleanNum)) return 'Amex';
    return 'Credit Card';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-500" /> Settings
        </h1>
        {activeTab === 'general' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-1 font-semibold text-sm transition-all border-b-2 relative ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-1 font-semibold text-sm transition-all border-b-2 relative ${
            activeTab === 'billing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Billing & Subscription
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-500" /> Company Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={company.domain}
                  onChange={(e) => setCompany({ ...company, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Monitoring Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Monitoring Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Screenshot Interval (minutes)</label>
                <input
                  type="number"
                  value={monitoring.screenshotInterval}
                  onChange={(e) => setMonitoring({ ...monitoring, screenshotInterval: Number(e.target.value) })}
                  min={1}
                  max={60}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Start</label>
                  <input
                    type="time"
                    value={monitoring.workStartTime}
                    onChange={(e) => setMonitoring({ ...monitoring, workStartTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work End</label>
                  <input
                    type="time"
                    value={monitoring.workEndTime}
                    onChange={(e) => setMonitoring({ ...monitoring, workEndTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Idle Threshold (minutes)</label>
                <input
                  type="number"
                  value={monitoring.idleTimeThreshold}
                  onChange={(e) => setMonitoring({ ...monitoring, idleTimeThreshold: Number(e.target.value) })}
                  min={1}
                  max={30}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-55">
                {[
                  { key: 'trackApps', label: 'Track Applications' },
                  { key: 'trackUrls', label: 'Track URLs' },
                  { key: 'blurScreenshots', label: 'Blur Screenshots' },
                  { key: 'allowManualPunch', label: 'Allow Manual Punch' },
                  { key: 'autoStopTracking', label: 'Auto Stop Tracking' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setMonitoring({ ...monitoring, [item.key]: !monitoring[item.key as keyof typeof monitoring] })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        monitoring[item.key as keyof typeof monitoring] ? 'bg-blue-600' : 'bg-slate-200'
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

          {/* Geo-Location & Geofencing */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 col-span-1 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500 animate-pulse" /> Geo-Location & Geofencing Settings
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600 font-medium">Enable Geofencing</span>
                  <button
                    type="button"
                    onClick={() => setMonitoring({ ...monitoring, enableGeofencing: !monitoring.enableGeofencing })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                      monitoring.enableGeofencing ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      monitoring.enableGeofencing ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600 font-medium">Require Location for Punch</span>
                  <button
                    type="button"
                    onClick={() => setMonitoring({ ...monitoring, requireLocationForPunch: !monitoring.requireLocationForPunch })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                      monitoring.requireLocationForPunch ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      monitoring.requireLocationForPunch ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Location Interval (min)</label>
                  <input
                    type="number"
                    value={monitoring.mobileLocationInterval}
                    onChange={(e) => setMonitoring({ ...monitoring, mobileLocationInterval: Number(e.target.value) })}
                    min={5}
                    max={60}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Office
                  </button>
                </div>

                {monitoring.officeLocations.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    No office locations configured. Enable location matching by adding one.
                  </p>
                )}

                <div className="space-y-3">
                  {monitoring.officeLocations.map((loc, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Office Name</label>
                          <input
                            type="text"
                            value={loc.name}
                            onChange={(e) => {
                              const updated = [...monitoring.officeLocations];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setMonitoring({ ...monitoring, officeLocations: updated });
                            }}
                            placeholder="HQ / Branch Office"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={loc.latitude}
                            onChange={(e) => {
                              const updated = [...monitoring.officeLocations];
                              updated[idx] = { ...updated[idx], latitude: Number(e.target.value) };
                              setMonitoring({ ...monitoring, officeLocations: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={loc.longitude}
                            onChange={(e) => {
                              const updated = [...monitoring.officeLocations];
                              updated[idx] = { ...updated[idx], longitude: Number(e.target.value) };
                              setMonitoring({ ...monitoring, officeLocations: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Geofence Radius (m)</label>
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
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = monitoring.officeLocations.filter((_, i) => i !== idx);
                          setMonitoring({ ...monitoring, officeLocations: updated });
                        }}
                        className="mt-6 p-1.5 text-red-500 hover:bg-red-50 rounded-lg hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing & Subscription Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Subscription Status */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-955 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute right-20 bottom-0 w-60 h-60 bg-indigo-500/15 rounded-full blur-2xl -z-10" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-7 h-7 text-indigo-400" />
                  <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Current Subscription</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight capitalize">
                  {subscription?.plan || tenant?.plan || 'Free'} Plan
                </h2>
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {subscription?.currentPeriodEnd ? (
                    <>Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}</>
                  ) : (
                    <>Active Trial Period – No payments scheduled</>
                  )}
                </p>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-slate-700/60 md:border-t-0 pt-4 md:pt-0 gap-4">
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-400">Monthly Amount</p>
                  <p className="text-2xl font-bold text-indigo-200">
                    {subscription?.amount ? `₹${subscription.amount}` : '₹0 (Free)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    {subscription?.status ? subscription.status : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Section Title */}
          <div className="text-center py-6">
            <h3 className="text-xl font-bold text-slate-800">Choose the Plan That Fits Your Organization</h3>
            <p className="text-slate-500 text-sm mt-1">Upgrade or scale down anytime. Dynamic scaling, secure checkout via Razorpay.</p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = (subscription?.plan || tenant?.plan || 'free').toLowerCase() === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 shadow-sm border transition-all duration-300 relative flex flex-col justify-between ${
                    plan.popular
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100/50 shadow-lg scale-102 -translate-y-1'
                      : 'border-slate-200 hover:shadow-md hover:-translate-y-1'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-current" /> Most Popular
                    </span>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-slate-800">{plan.name}</h4>
                      {isCurrent && (
                        <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-200">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 text-xs mb-4 min-h-[32px]">{plan.description}</p>

                    {/* Price */}
                    <div className="flex items-baseline mb-6 border-b border-slate-100 pb-4">
                      <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                      <span className="text-slate-400 text-sm font-semibold ml-1">/{plan.period}</span>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-slate-600 text-xs font-medium">
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-blue-500' : 'text-slate-400'}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions Button */}
                  <button
                    onClick={() => handleUpgradeClick(plan)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                        : plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg shadow-blue-200'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : 'Select Plan & Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Secure details footer */}
          <div className="flex items-center justify-center gap-6 py-4 text-slate-400 text-xs border-t border-slate-100 mt-6">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> 256-Bit SSL Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Secure Checkout via Razorpay
            </span>
          </div>
        </div>
      )}

      {/* Credit Card Sandbox Checkout Simulator Modal */}
      {paymentModalOpen && selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-scale-up relative">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-955 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" /> Payment Sandbox checkout
                </h3>
                <p className="text-slate-300 text-xs">Simulating payment processing for {selectedPlanForUpgrade.name}</p>
              </div>
              <button
                onClick={() => !processingPayment && setPaymentModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                disabled={processingPayment}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Sleek Credit Card Visualization Container */}
              <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-950 rounded-xl p-5 text-white flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-700/50">
                <div className="absolute right-0 top-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl -z-10" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Corporate Plan Card</p>
                    <p className="text-sm font-bold mt-1 text-slate-200">EMS Sandbox Link</p>
                  </div>
                  <span className="font-semibold italic text-xs tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                    {getCardType(cardDetails.number)}
                  </span>
                </div>

                <div className="my-2">
                  {/* Card Number display */}
                  <div className="font-mono text-lg sm:text-xl tracking-widest text-slate-100 select-all">
                    {cardDetails.number || '•••• •••• •••• ••••'}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">Cardholder Name</p>
                    <p className="font-medium text-xs truncate max-w-[180px] text-slate-200 uppercase">
                      {cardDetails.name || 'Your Company Name'}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">Expires</p>
                      <p className="font-mono text-xs text-slate-200">{cardDetails.expiry || 'MM/YY'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">CVV</p>
                      <p className="font-mono text-xs text-slate-200">{cardDetails.cvv || '•••'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe / TCS Pvt Ltd"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                      disabled={processingPayment}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4111 2222 3333 4444"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
                      disabled={processingPayment}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 2) {
                            v = `${v.substring(0, 2)}/${v.substring(2, 4)}`;
                          }
                          setCardDetails({ ...cardDetails, expiry: v });
                        }}
                        disabled={processingPayment}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">CVV Code</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="•••"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })}
                        disabled={processingPayment}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Sandbox Alert */}
                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold">Sandbox Mode Activated:</span> The system did not detect production Razorpay webhook secret variables. You can safely pay using any simulated card.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSandboxQuickPay}
                    disabled={processingPayment}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors border border-slate-200 disabled:opacity-50"
                  >
                    Quick Sandbox Pay
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 disabled:opacity-50"
                  >
                    {processingPayment ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Authorizing...
                      </>
                    ) : (
                      <>Pay {selectedPlanForUpgrade.price}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
