import React, { useEffect, useState } from 'react';
import { tenantAPI } from '../services/api';
import { Building2, Search, Users } from 'lucide-react';

interface TenantItem {
  _id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  employeeCount: number;
  createdAt: string;
}

const Tenants: React.FC = () => {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await tenantAPI.list({ search });
        setTenants(res.data.data.tenants || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, [search]);

  const planColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    starter: 'bg-blue-100 text-blue-600',
    business: 'bg-purple-100 text-purple-600',
    enterprise: 'bg-amber-100 text-amber-600',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-blue-500" /> Tenants (Companies)
      </h1>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employees</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenants.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${planColors[t.plan] || planColors.free}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        {t.employeeCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[t.status] || statusColors.active}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No tenants found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tenants;
