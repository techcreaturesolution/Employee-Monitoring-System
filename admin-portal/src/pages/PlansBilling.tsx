import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Users,
  HardDrive,
  CheckCircle,
  XCircle,
  Settings2,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PlanItem {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  employeeLimit: number;
  storageGb: number;
  features: {
    appTracking: boolean;
    urlTracking: boolean;
    blurScreenshots: boolean;
    geofencing: boolean;
    realtimeSupport: boolean;
  };
}

const PlansBilling: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([
    {
      id: 'plan-1',
      name: 'Free Plan',
      priceMonthly: 0,
      priceYearly: 0,
      employeeLimit: 5,
      storageGb: 1,
      features: { appTracking: true, urlTracking: false, blurScreenshots: false, geofencing: false, realtimeSupport: false }
    },
    {
      id: 'plan-2',
      name: 'Starter Plan',
      priceMonthly: 49,
      priceYearly: 490,
      employeeLimit: 25,
      storageGb: 10,
      features: { appTracking: true, urlTracking: true, blurScreenshots: true, geofencing: false, realtimeSupport: false }
    },
    {
      id: 'plan-3',
      name: 'Business Plan',
      priceMonthly: 149,
      priceYearly: 1490,
      employeeLimit: 100,
      storageGb: 50,
      features: { appTracking: true, urlTracking: true, blurScreenshots: true, geofencing: true, realtimeSupport: true }
    },
    {
      id: 'plan-4',
      name: 'Enterprise Plan',
      priceMonthly: 299,
      priceYearly: 2990,
      employeeLimit: 500,
      storageGb: 200,
      features: { appTracking: true, urlTracking: true, blurScreenshots: true, geofencing: true, realtimeSupport: true }
    },
  ]);

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceYearly, setPriceYearly] = useState(0);
  const [employeeLimit, setEmployeeLimit] = useState(5);
  const [storageGb, setStorageGb] = useState(1);
  const [appTracking, setAppTracking] = useState(true);
  const [urlTracking, setUrlTracking] = useState(false);
  const [blurScreenshots, setBlurScreenshots] = useState(false);
  const [geofencing, setGeofencing] = useState(false);
  const [realtimeSupport, setRealtimeSupport] = useState(false);

  const handleOpenCreate = () => {
    setName('');
    setPriceMonthly(0);
    setPriceYearly(0);
    setEmployeeLimit(5);
    setStorageGb(1);
    setAppTracking(true);
    setUrlTracking(false);
    setBlurScreenshots(false);
    setGeofencing(false);
    setRealtimeSupport(false);
    setActiveModal('create');
  };

  const handleOpenEdit = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setName(plan.name);
    setPriceMonthly(plan.priceMonthly);
    setPriceYearly(plan.priceYearly);
    setEmployeeLimit(plan.employeeLimit);
    setStorageGb(plan.storageGb);
    setAppTracking(plan.features.appTracking);
    setUrlTracking(plan.features.urlTracking);
    setBlurScreenshots(plan.features.blurScreenshots);
    setGeofencing(plan.features.geofencing);
    setRealtimeSupport(plan.features.realtimeSupport);
    setActiveModal('edit');
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan: PlanItem = {
      id: `plan-${Date.now()}`,
      name,
      priceMonthly,
      priceYearly,
      employeeLimit,
      storageGb,
      features: { appTracking, urlTracking, blurScreenshots, geofencing, realtimeSupport }
    };
    setPlans([...plans, newPlan]);
    toast.success('Subscription plan created successfully');
    setActiveModal(null);
  };

  const handleEditPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const updated = plans.map(p =>
      p.id === selectedPlan.id
        ? {
            ...p,
            name,
            priceMonthly,
            priceYearly,
            employeeLimit,
            storageGb,
            features: { appTracking, urlTracking, blurScreenshots, geofencing, realtimeSupport }
          }
        : p
    );
    setPlans(updated);
    toast.success('Subscription plan updated');
    setActiveModal(null);
  };

  const handleDeletePlan = (id: string) => {
    setPlans(plans.filter(p => p.id !== id));
    toast.success('Subscription plan deleted');
  };

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Plans & Billing Configurations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Customize client subscription packages, pricing tier and limit thresholds</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* ── Grid of Plans ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col relative group hover:border-slate-500 transition-all">
            {/* Action buttons */}
            <div className="absolute top-4 right-4 flex gap-1 bg-[#0d1117] border border-[#30363d] p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenEdit(plan)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Edit Plan"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeletePlan(plan.id)}
                className="p-1 text-red-400 hover:text-red-300 rounded transition-colors"
                title="Delete Plan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subscription Package</p>
            <h3 className="text-lg font-bold text-white mb-4">{plan.name}</h3>

            {/* Pricing */}
            <div className="mb-4">
              <span className="text-3xl font-extrabold text-white font-mono">${plan.priceMonthly}</span>
              <span className="text-slate-500 text-xs font-medium"> / month</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Or billed annually at ${plan.priceYearly}/yr</p>
            </div>

            {/* Limits */}
            <div className="space-y-2 pb-4 mb-4 border-b border-[#30363d]">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Up to <span className="font-semibold text-white">{plan.employeeLimit}</span> employees</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
                <span><span className="font-semibold text-white">{plan.storageGb} GB</span> storage limit</span>
              </div>
            </div>

            {/* Feature Checklists */}
            <div className="space-y-2 text-xs text-slate-400">
              {[
                { active: plan.features.appTracking, label: 'App Tracking' },
                { active: plan.features.urlTracking, label: 'Url Tracking' },
                { active: plan.features.blurScreenshots, label: 'Blur Screenshots' },
                { active: plan.features.geofencing, label: 'Geofencing' },
                { active: plan.features.realtimeSupport, label: 'Real-time Support' },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  {feat.active ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-700 shrink-0" />
                  )}
                  <span className={feat.active ? 'text-slate-200' : 'text-slate-500 line-through'}>{feat.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleOpenEdit(plan)}
              className="mt-6 w-full py-2 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-slate-300 hover:text-white border border-[#30363d] rounded-lg transition-all"
            >
              Configure Plan
            </button>
          </div>
        ))}
      </div>

      {/* ════════ CREATE/EDIT MODAL ════════ */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings2 className="w-4.5 h-4.5 text-emerald-400" />
                {activeModal === 'create' ? 'Create Subscription Plan' : 'Configure Subscription Plan'}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={activeModal === 'create' ? handleCreatePlan : handleEditPlan} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Starter Plan"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Yearly Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee Limit</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={employeeLimit}
                    onChange={(e) => setEmployeeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Storage Limit (GB)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={storageGb}
                    onChange={(e) => setStorageGb(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-2 border-t border-[#30363d] pt-3 mt-4">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Feature Entitlements</label>
                {[
                  { state: appTracking, set: setAppTracking, label: 'App Activity Tracking' },
                  { state: urlTracking, set: setUrlTracking, label: 'Url Website Tracking' },
                  { state: blurScreenshots, set: setBlurScreenshots, label: 'Auto Blur Screenshots' },
                  { state: geofencing, set: setGeofencing, label: 'Mobile Geofencing Support' },
                  { state: realtimeSupport, set: setRealtimeSupport, label: 'Real-time Business Support' },
                ].map((feat, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={feat.state}
                      onChange={(e) => feat.set(e.target.checked)}
                      className="w-4 h-4 bg-[#0d1117] border-[#30363d] rounded text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">{feat.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#30363d] mt-5 justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-[#30363d] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all"
                >
                  {activeModal === 'create' ? 'Create Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansBilling;
