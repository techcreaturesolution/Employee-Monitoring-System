import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield,
  Search,
  Plus,
  User,
  Mail,
  Building,
  Users,
  CheckCircle,
  PlusCircle,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminPage from './SuperAdminPage';
import { employeeAPI, managerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ManagerItem {
  id: string;
  name: string;
  email: string;
  department: string;
  teamSize: number;
  status: 'active' | 'inactive';
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedManagerId?: string;
}

const Managers: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'list';

  const [search, setSearch] = useState('');
  const [managers, setManagers] = useState<ManagerItem[]>([]);
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('Engineering');

  // Assignment State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const fetchEmployeesAndManagers = async () => {
    if (user?.role === 'super_admin') {
      setManagers([]);
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mgrRes, empRes] = await Promise.all([
        managerAPI.list({ limit: 100 }),
        employeeAPI.list({ limit: 100 })
      ]);
      const allManagers = mgrRes.data.data.managers || [];
      const allEmployees = empRes.data.data.employees || [];

      // Map managers
      const mgrList = allManagers.map((u: any) => ({
        id: u._id || u.id,
        name: u.name,
        email: u.email,
        department: u.department || 'Management',
        teamSize: allEmployees.filter((emp: any) => emp.role === 'employee' && emp.department === u.department).length,
        status: u.status || 'active',
      }));

      // Filter employees
      const empList = allEmployees.filter((u: any) => u.role === 'employee' || u.role === 'user').map((u: any) => {
        const deptManager = mgrList.find((m: any) => m.department === u.department);
        return {
          id: u._id || u.id,
          name: u.name,
          email: u.email,
          role: u.designation || 'Developer',
          assignedManagerId: deptManager ? deptManager.id : undefined,
        };
      });

      setManagers(mgrList);
      setEmployees(empList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEmployeesAndManagers();
    }
  }, [user]);

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error('Please enter name and email');
      return;
    }
    try {
      await managerAPI.create({
        name: formName,
        email: formEmail,
        department: formDept,
        designation: 'Department Manager'
      });
      toast.success('Manager added successfully!');
      setFormName('');
      setFormEmail('');
      setSearchParams({ tab: 'list' });
      fetchEmployeesAndManagers();
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add manager');
    }
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedManagerId) {
      toast.error('Please select both employee and manager');
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployeeId);
    const mgr = managers.find(m => m.id === selectedManagerId);
    if (!emp || !mgr) return;

    try {
      await managerAPI.assignTeam({ managerId: selectedManagerId, employeeIds: [selectedEmployeeId] });
      toast.success(`Assigned ${emp.name} to ${mgr.name}'s team!`);
      setSelectedEmployeeId('');
      setSelectedManagerId('');
      setSearchParams({ tab: 'list' });
      fetchEmployeesAndManagers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign team member');
    }
  };

  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminPage
      title="Managers"
      subtitle="Manage team leads, manager profiles, and employee assignments"
      icon={Shield}
      accentColor="text-blue-400"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto">
          {[
            { id: 'list', label: 'Manager List' },
            { id: 'add', label: 'Add Manager' },
            { id: 'assign', label: 'Team Assignment' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === 'list' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3 animate-pulse" />
              <p className="text-slate-400 text-xs">Loading managers...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Box */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search managers by name, email, or department..."
                    className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setSearchParams({ tab: 'add' })}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Manager
                </button>
              </div>

              {/* Table */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#30363d] bg-[#161b22]">
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Manager ID</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Team Size</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d] bg-[#0d1117]/30">
                      {filteredManagers.map((m) => (
                        <tr key={m.id} className="hover:bg-[#161b22]/50 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-mono font-semibold text-slate-400">{m.id}</td>
                          <td className="px-5 py-3.5 text-xs text-white font-semibold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                              {m.name.charAt(0)}
                            </div>
                            {m.name}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-300">{m.email}</td>
                          <td className="px-5 py-3.5 text-xs">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                              {m.department}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-300 flex items-center gap-1.5 mt-2">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            {m.teamSize} employees
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredManagers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs">
                            No managers found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
        

              {activeTab === 'add' && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 max-w-xl shadow-lg">
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-blue-400" />
                    Register New Team Manager
                  </h2>
                  <form onSubmit={handleAddManager} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Enter full name"
                          className="w-full pl-9 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="w-full pl-9 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                          value={formDept}
                          onChange={(e) => setFormDept(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Operations">Operations</option>
                          <option value="Sales">Sales</option>
                          <option value="HR">HR</option>
                          <option value="Marketing">Marketing</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSearchParams({ tab: 'list' })}
                        className="px-4 py-2 bg-transparent hover:bg-[#21262d] border border-[#30363d] text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Create Account
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'assign' && (
                loading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-2xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3 animate-pulse" />
                    <p className="text-slate-400 text-xs">Loading team assignments...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Assignment Form Card */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg h-fit">
                      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-400" />
                        Assign Team Member
                      </h2>
                      <form onSubmit={handleAssignTeam} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Employee</label>
                          <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Employee --</option>
                            {employees
                              .filter(emp => !emp.assignedManagerId)
                              .map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Select Manager</label>
                          <select
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Manager --</option>
                            {managers.map(mgr => (
                              <option key={mgr.id} value={mgr.id}>{mgr.name} - {mgr.department}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Assignment
                        </button>
                      </form>
                    </div>

                    {/* Assignments View Card */}
                    <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
                      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Current Team Formations
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#30363d] text-[10px] font-semibold text-slate-400 uppercase">
                              <th className="pb-3 pr-4">Employee</th>
                              <th className="pb-3 px-4">Role</th>
                              <th className="pb-3 pl-4">Reporting Manager</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#30363d] bg-[#0d1117]/10">
                            {employees.map(emp => {
                              const mgr = managers.find(m => m.id === emp.assignedManagerId);
                              return (
                                <tr key={emp.id} className="hover:bg-[#161b22]/50 transition-colors">
                                  <td className="py-3 pr-4 text-xs font-semibold text-white">{emp.name}</td>
                                  <td className="py-3 px-4 text-xs text-slate-300">{emp.role}</td>
                                  <td className="py-3 pl-4 text-xs">
                                    {mgr ? (
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-blue-400 font-semibold">{mgr.name}</span>
                                        <span className="text-[10px] text-slate-500">({mgr.department})</span>
                                      </div>
                                    ) : (
                                      <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-medium">Unassigned</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )
              )}
            </div>
    </SuperAdminPage>
  );
};

export default Managers;
