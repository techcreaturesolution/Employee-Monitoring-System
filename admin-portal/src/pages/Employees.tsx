import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { employeeAPI, departmentAPI } from '../services/api';
import { User, Pagination } from '../types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Key,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Employees: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'employee', department: '', designation: '', employeeId: '', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'add') {
      resetForm();
      setShowModal(true);
    } else if (tab === 'import') {
      toast.success('Drag and drop employee CSV file to import.');
    } else if (tab === 'activity') {
      navigate('/activity');
    }
  }, [searchParams]);

  const fetchEmployees = async (page = 1) => {
    if (user?.role === 'super_admin') {
      setEmployees([]);
      setPagination({ total: 0, page: 1, limit: 20, pages: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await employeeAPI.list({ page, limit: 20, search });
      setEmployees(res.data.data.employees);
      setPagination(res.data.data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await departmentAPI.list({ limit: 100 });
        setDepartments(res.data.data || []);
      } catch (e) {
        console.error('Failed to load departments');
      }
    };

    if (user) {
      fetchEmployees();
      if (['company_admin', 'super_admin', 'hr', 'manager'].includes(user.role)) {
        fetchDepts();
      }
    }
  }, [user, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) {
        delete (payload as any).password;
      }
      
      if (editingId) {
        await employeeAPI.update(editingId, payload);
        toast.success('Employee updated');
      } else {
        await employeeAPI.add(payload);
        toast.success('Employee added');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleEdit = (emp: User) => {
    setEditingId(emp.id || (emp as unknown as Record<string, string>)._id);
    setForm({
      name: emp.name,
      email: emp.email,
      password: '',
      role: emp.role,
      department: emp.department,
      designation: emp.designation,
      employeeId: emp.employeeId,
      phone: emp.phone,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const emp = employees.find(e => (e.id || (e as unknown as Record<string, string>)._id) === id);
    if (!confirm(emp ? `Deactivate employee "${emp.name}"?` : 'Deactivate this employee?')) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee deactivated');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to deactivate');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const res = await employeeAPI.regenerateKey(id);
      toast.success('New agent key: ' + res.data.data.agentKey);
    } catch (error) {
      toast.error('Failed to regenerate key');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: 'employee', department: '', designation: '', employeeId: '', phone: '' });
  };

  const copyAgentKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Agent key copied!');
  };

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Employees</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="bg-[#161b22] rounded-xl border border-[#30363d] mb-4">
        <div className="p-4 border-b border-[#30363d]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
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
              <thead className="bg-[#21262d]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Agent Key</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {employees.map((emp) => {
                  const empId = emp.id || (emp as unknown as Record<string, string>)._id;
                  return (
                    <tr key={empId} className="hover:bg-[#21262d] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold border border-blue-500/30">
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{emp.department || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                          {emp.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            emp.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {emp.agentKey ? (
                          <button
                            onClick={() => copyAgentKey(emp.agentKey)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
                          >
                            <Copy className="w-3 h-3" />
                            {emp.agentKey.substring(0, 12)}...
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(emp)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRegenerateKey(empId)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors">
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(empId)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#30363d]">
            <p className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => fetchEmployees(pagination.page - 1)}
                className="p-2 border border-[#30363d] rounded-lg disabled:opacity-50 text-slate-300 hover:bg-[#21262d]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchEmployees(pagination.page + 1)}
                className="p-2 border border-[#30363d] rounded-lg disabled:opacity-50 text-slate-300 hover:bg-[#21262d]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#30363d]">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Dummy fields to trick browser autofill */}
              <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Name*</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoComplete="new-name"
                    name="new-emp-name"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email*</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="new-email"
                    name="new-emp-email"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      autoComplete="new-password"
                      name="new-emp-password"
                      className="w-full pl-3 pr-10 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#161b22] text-slate-500">Select Department...</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name} className="bg-[#161b22] text-white">
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="employee" className="bg-[#161b22] text-white">Employee</option>
                  <option value="manager" className="bg-[#161b22] text-white">Manager</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[#30363d] mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d] rounded-lg text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                >
                  {editingId ? 'Update' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
