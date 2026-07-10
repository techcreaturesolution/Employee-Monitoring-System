import React, { useEffect, useState } from 'react';
import { departmentAPI } from '../services/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Department {
  _id: string;
  name: string;
  description: string;
  managerId?: { _id: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

const Departments: React.FC = () => {
  const { user } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.list({ search });
      setDepartments(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDepartments();
    }
  }, [user, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await departmentAPI.update(editingId, form);
        toast.success('Department updated');
      } else {
        await departmentAPI.create(form);
        toast.success('Department added');
      }
      setShowModal(false);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingId(dept._id);
    setForm({ name: dept.name, description: dept.description });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '' });
  };

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500" /> Departments
        </h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Department
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
              placeholder="Search departments..."
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Department Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                      No departments found
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept._id} className="hover:bg-[#21262d] transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{dept.name}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {dept.description || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(dept)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(dept._id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#30363d]">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Department Name*</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[#30363d] mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d] rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all"
                >
                  {editingId ? 'Update' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
