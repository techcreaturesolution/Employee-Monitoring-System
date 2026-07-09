import React, { useEffect, useState } from 'react';
import { tenantAPI, authAPI } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import {
  Building2,
  Search,
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  X,
  Mail,
  User,
  Phone,
  Check,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { addAuditLog } from '../services/auditLogger';
import { useAuth } from '../context/AuthContext';

interface TenantItem {
  _id: string;
  name: string;
  email: string;
  plan: 'free' | 'starter' | 'business' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  employeeCount: number;
  createdAt: string;
  phone?: string;
  adminName?: string;
}

const planColors: Record<string, string> = {
  free: 'bg-slate-500/10 text-slate-400 border border-slate-500/25',
  starter: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  business: 'bg-purple-500/10 text-purple-400 border border-purple-500/25',
  enterprise: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  trial: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/25',
};

const Tenants: React.FC = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'delete' | 'details' | 'assign' | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAdminName, setFormAdminName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPlan, setFormPlan] = useState<'free' | 'starter' | 'business' | 'enterprise'>('free');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended' | 'trial'>('active');
  const [geo, setGeo] = useState<{ formatted: string; lat: number; lng: number; components: any } | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await tenantAPI.list({ search });
      const apiTenants = res.data.data.tenants || [];
      setTenants(apiTenants);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load companies from server.');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTenants();
    }
  }, [user, search]);

  // Open modals
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormAdminName('');
    setFormPhone('');
    setFormPlan('free');
    setFormStatus('active');
    setActiveModal('add');
  };

  const handleOpenEdit = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setFormName(tenant.name);
    setFormEmail(tenant.email);
    setFormAdminName(tenant.adminName || '');
    setFormPhone(tenant.phone || '');
    setFormPlan(tenant.plan);
    setFormStatus(tenant.status);
    setActiveModal('edit');
  };

  const handleOpenDelete = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setActiveModal('delete');
  };

  const handleOpenDetails = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setActiveModal('details');
  };

  const handleOpenAssign = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setFormPlan(tenant.plan);
    setActiveModal('assign');
  };

  // Actions
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error('Please enter Company Name and Email');
      return;
    }
    try {
      await tenantAPI.create({
        companyName: formName,
        companyEmail: formEmail,
        adminName: formAdminName || 'Company Admin',
        phone: formPhone,
        plan: formPlan,
        status: formStatus,
        address: {
          street: '',
          city: geo?.components?.city || '',
          state: geo?.components?.state || '',
          country: geo?.components?.country || 'India',
          zipCode: geo?.components?.zipCode || '',
          formatted: geo?.formatted || '',
        },
        latitude: geo?.lat || 0,
        longitude: geo?.lng || 0,
      });
      toast.success('Company added successfully');
      addAuditLog({
        action: 'Company Created',
        details: `Company "${formName}" created with plan "${formPlan}"`,
        severity: 'info'
      });
      setActiveModal(null);
      fetchTenants();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create company');
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      const oldPlan = selectedTenant.plan;
      await tenantAPI.update(selectedTenant._id, {
        name: formName,
        email: formEmail,
        adminName: formAdminName,
        phone: formPhone,
        plan: formPlan,
        status: formStatus,
      });
      toast.success('Company details updated');
      
      if (oldPlan !== formPlan) {
        addAuditLog({
          action: 'Subscription Changed',
          details: `Subscription plan for company "${selectedTenant.name}" changed from "${oldPlan}" to "${formPlan}"`,
          severity: 'warning'
        });
      }

      setActiveModal(null);
      fetchTenants();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update company');
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedTenant) return;
    try {
      await tenantAPI.delete(selectedTenant._id);
      toast.success('Company deleted successfully');
      setActiveModal(null);
      fetchTenants();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete company');
    }
  };

  const handleToggleSuspend = async (tenant: TenantItem) => {
    const newStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    try {
      await tenantAPI.update(tenant._id, { status: newStatus });
      toast.success(newStatus === 'suspended' ? 'Company suspended' : 'Company activated');
      fetchTenants();
    } catch (err) {
      console.error(err);
      toast.error('Failed to change company status');
    }
  };

  const handleAssignSubscription = async () => {
    if (!selectedTenant) return;
    const oldPlan = selectedTenant.plan;
    try {
      await tenantAPI.update(selectedTenant._id, { plan: formPlan });
      toast.success(`Assigned ${formPlan} plan to ${selectedTenant.name}`);
      
      if (oldPlan !== formPlan) {
        addAuditLog({
          action: 'Subscription Changed',
          details: `Subscription plan for company "${selectedTenant.name}" changed from "${oldPlan}" to "${formPlan}"`,
          severity: 'warning'
        });
      }

      setActiveModal(null);
      fetchTenants();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to assign subscription');
    }
  };

  return (
    <div className="min-h-full bg-[#0d1117] text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            Tenant Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage platform companies, plans, and account status</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-blue-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name, email or domain..."
            className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Table / Grid ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3" />
            <p className="text-slate-500 text-xs">Loading companies...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#161b22]">
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact Person</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employees</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] bg-[#0d1117]/50">
                {tenants.map((t) => (
                  <tr key={t._id} className="hover:bg-[#161b22]/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-sm">
                          {t.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-300 font-medium">{t.adminName || '—'}</p>
                      <p className="text-[10px] text-slate-500">{t.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${planColors[t.plan] || planColors.free}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.employeeCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[t.status] || statusColors.active}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(t)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenAssign(t)}
                          title="Assign Subscription"
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-[#21262d] rounded-md transition-all"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          title="Edit"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(t)}
                          title={t.status === 'suspended' ? 'Activate' : 'Suspend'}
                          className={`p-1.5 rounded-md transition-all ${
                            t.status === 'suspended'
                              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-[#21262d]'
                              : 'text-amber-400 hover:text-amber-300 hover:bg-[#21262d]'
                          }`}
                        >
                          {t.status === 'suspended' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenDelete(t)}
                          title="Delete"
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                      <p className="text-xs">No companies found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════ ADD/EDIT DIALOG MODAL ════════ */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`bg-[#161b22] border border-[#30363d] rounded-xl w-full ${activeModal === 'add' ? 'max-w-2xl' : 'max-w-md'} shadow-2xl overflow-hidden`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-blue-400" />
                {activeModal === 'add' ? 'Add New Company' : 'Edit Company Details'}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={activeModal === 'add' ? handleAddCompany : handleEditCompany} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="e.g. admin@acme.com"
                        className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Admin Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={formAdminName}
                          onChange={(e) => setFormAdminName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan Tier</label>
                      <select
                        value={formPlan}
                        onChange={(e) => setFormPlan(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="free">Free Plan</option>
                        <option value="starter">Starter Plan</option>
                        <option value="business">Business Plan</option>
                        <option value="enterprise">Enterprise Plan</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>

                {activeModal === 'add' && (
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-[#30363d] pt-4 md:pt-0 md:pl-4">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Office Location</label>
                    <LocationPicker onChange={setGeo} />
                  </div>
                )}
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
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-blue-500/10 transition-all"
                >
                  {activeModal === 'add' ? 'Add Company' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ ASSIGN SUBSCRIPTION MODAL ════════ */}
      {activeModal === 'assign' && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-blue-400" />
                Assign Subscription
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-400">Company</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedTenant.name}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Choose Subscription Plan</label>
                <div className="space-y-2">
                  {[
                    { id: 'free', name: 'Free Plan', desc: 'Up to 5 Employees · 1GB Storage' },
                    { id: 'starter', name: 'Starter Plan', desc: 'Up to 25 Employees · 10GB Storage' },
                    { id: 'business', name: 'Business Plan', desc: 'Up to 100 Employees · 50GB Storage' },
                    { id: 'enterprise', name: 'Enterprise Plan', desc: 'Unlimited Employees · 200GB Storage' },
                  ].map(plan => (
                    <label
                      key={plan.id}
                      onClick={() => setFormPlan(plan.id as any)}
                      className={`flex items-start gap-3 p-3 bg-[#0d1117] hover:bg-[#161b22] border rounded-xl cursor-pointer transition-all ${
                        formPlan === plan.id ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-[#30363d]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${
                        formPlan === plan.id ? 'border-blue-500' : 'border-[#30363d]'
                      }`}>
                        {formPlan === plan.id && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{plan.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{plan.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-[#30363d] mt-5 justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-[#30363d] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSubscription}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-blue-500/10 transition-all"
                >
                  Assign Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ COMPANY DETAILS MODAL ════════ */}
      {activeModal === 'details' && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-blue-400" />
                Company Details
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5 pb-4 border-b border-[#30363d]">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-lg">
                  {selectedTenant.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedTenant.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedTenant.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Contact Admin</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{selectedTenant.adminName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Contact Phone</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{selectedTenant.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Plan Subscribed</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize mt-1 ${planColors[selectedTenant.plan] || planColors.free}`}>
                    {selectedTenant.plan}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Status</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize mt-1 ${statusColors[selectedTenant.status] || statusColors.active}`}>
                    {selectedTenant.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Employees Registered</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{selectedTenant.employeeCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Created At</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    {new Date(selectedTenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-[#30363d] mt-5 justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-[#30363d] transition-all"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM DIALOG ════════ */}
      {activeModal === 'delete' && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                Delete Company
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <span className="font-semibold text-white">{selectedTenant.name}</span>?
              </p>
              <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg leading-relaxed">
                Warning: This action will permanently remove the company, its employees, screenshots, logs, and billing details. This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-2 border-t border-[#30363d] mt-5 justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-[#30363d] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCompany}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-red-500/10 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
