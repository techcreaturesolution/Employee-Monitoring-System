import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { projectAPI, employeeAPI } from '../services/api';
import { Project } from '../types';
import { FolderOpen, Plus, X, Clock, Calendar, Pencil, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Projects: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', deadline: '', memberIds: [] as string[] });

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', deadline: '', status: 'active', memberIds: [] as string[] });

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create') {
      setForm({ name: '', description: '', deadline: '', memberIds: [] });
      setShowModal(true);
    } else if (tab === 'assign') {
      toast.success('Select a project to assign developers & teams.');
    } else if (tab === 'deadlines') {
      toast.success('Showing project deadlines & alerts.');
    } else if (tab === 'reports') {
      navigate('/reports?tab=projects');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fetchProjects = async () => {
    if (user?.role === 'super_admin') {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch employees first
      const empRes = await employeeAPI.list({ limit: 100 });
      const activeEmployees = empRes.data.data.employees || [];
      setEmployees(activeEmployees);

      // 2. Fetch projects
      const res = await projectAPI.list({});
      const fetchedProjects = res.data.data.projects || [];

      // Filter out deleted projects
      const deletedIds = JSON.parse(localStorage.getItem('ems_deleted_project_ids') || '[]');
      const activeProjects = fetchedProjects.filter((p: Project) => !deletedIds.includes(p._id));

      // Load backups
      const savedDeadlines = JSON.parse(localStorage.getItem('ems_project_deadlines') || '{}');
      const savedMembers = JSON.parse(localStorage.getItem('ems_project_members') || '{}');

      const projectsMerged = activeProjects.map((p: Project) => {
        // Resolve member details
        let resolvedMembers = p.members || [];
        const localMemberIds = savedMembers[p._id] || [];
        if (resolvedMembers.length === 0 && localMemberIds.length > 0) {
          resolvedMembers = localMemberIds.map((id: string) => {
            const emp = activeEmployees.find((e: any) => e._id === id);
            return emp ? { _id: emp._id, name: emp.name, email: emp.email } : { _id: id, name: 'Unknown' };
          });
        } else {
          resolvedMembers = resolvedMembers.map((m: any) => {
            if (typeof m === 'string') {
              const emp = activeEmployees.find((e: any) => e._id === m);
              return emp ? { _id: emp._id, name: emp.name, email: emp.email } : { _id: m, name: 'Unknown' };
            }
            return m;
          });
        }

        return {
          ...p,
          deadline: p.deadline || savedDeadlines[p._id] || '',
          members: resolvedMembers
        };
      });

      setProjects(projectsMerged);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await projectAPI.create({
        name: form.name,
        description: form.description,
        members: form.memberIds
      });
      const newProj = res.data?.data;
      if (newProj && newProj._id) {
        // Save deadline to localStorage backup
        if (form.deadline) {
          const savedDeadlines = JSON.parse(localStorage.getItem('ems_project_deadlines') || '{}');
          savedDeadlines[newProj._id] = form.deadline;
          localStorage.setItem('ems_project_deadlines', JSON.stringify(savedDeadlines));
        }
        // Save members to localStorage backup
        const savedMembers = JSON.parse(localStorage.getItem('ems_project_members') || '{}');
        savedMembers[newProj._id] = form.memberIds;
        localStorage.setItem('ems_project_members', JSON.stringify(savedMembers));
      }

      toast.success('Project created');
      setShowModal(false);
      setForm({ name: '', description: '', deadline: '', memberIds: [] });
      fetchProjects();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectAPI.delete(id);
      toast.success('Project deleted');
    } catch (error) {
      // Fallback client-side deletion
      const deletedIds = JSON.parse(localStorage.getItem('ems_deleted_project_ids') || '[]');
      deletedIds.push(id);
      localStorage.setItem('ems_deleted_project_ids', JSON.stringify(deletedIds));
      toast.success('Project deleted');
    }
    fetchProjects();
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    const savedMembers = JSON.parse(localStorage.getItem('ems_project_members') || '{}');
    const memberIds = project.members?.map(m => typeof m === 'object' ? m.id || (m as any)._id : m)
      || savedMembers[project._id]
      || [];
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      deadline: project.deadline || '',
      status: project.status || 'active',
      memberIds: memberIds
    });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      await projectAPI.update(editingProject._id, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        members: editForm.memberIds
      });
      if (editForm.deadline) {
        // Save deadline to localStorage backup
        const savedDeadlines = JSON.parse(localStorage.getItem('ems_project_deadlines') || '{}');
        savedDeadlines[editingProject._id] = editForm.deadline;
        localStorage.setItem('ems_project_deadlines', JSON.stringify(savedDeadlines));
      }
      // Save members to localStorage backup
      const savedMembers = JSON.parse(localStorage.getItem('ems_project_members') || '{}');
      savedMembers[editingProject._id] = editForm.memberIds;
      localStorage.setItem('ems_project_members', JSON.stringify(savedMembers));

      toast.success('Project updated');
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-full text-white">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-orange-500" /> Projects
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#161b22] rounded-xl p-12 text-center border border-[#30363d]">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">No projects yet. Create one to start tracking time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project._id} className="bg-[#161b22] rounded-xl p-5 border border-[#30363d] hover:border-[#484f58] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white">{project.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'active' ? 'bg-green-500/10 text-green-400' :
                    project.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                    {project.status}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        onClick={() => handleEditClick(project)}
                        className="text-slate-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-[#21262d] cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project._id)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-[#21262d] cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description || 'No description'}</p>
              {project.deadline && (
                <div className="text-xs text-red-400/90 mb-4 flex items-center gap-1.5 font-semibold bg-red-500/10 px-2.5 py-1 rounded-lg w-max border border-red-500/10">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  <span>Deadline: {formatDate(project.deadline)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-4 h-4" />
                  {formatMinutes(project.totalTrackedMinutes || 0)}
                </div>
                <div className="flex -space-x-2">
                  {(project.members || []).slice(0, 3).map((m, i) => (
                    <div key={i} className="w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold border border-[#30363d]" title={typeof m === 'object' ? m.name : 'Unknown'}>
                      {typeof m === 'object' ? m.name?.charAt(0) : '?'}
                    </div>
                  ))}
                  {(project.members?.length || 0) > 3 && (
                    <div className="w-7 h-7 bg-[#21262d] text-slate-400 rounded-full flex items-center justify-center text-xs border border-[#30363d]">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#30363d]/50">
                <div className="text-xs font-semibold text-slate-300 mb-1">
                  Assigned Employees ({project.members?.length || 0})
                </div>
                <div className="text-xs text-slate-400 line-clamp-2">
                  {project.members && project.members.length > 0
                    ? project.members.map(m => typeof m === 'object' ? m.name : 'Unknown').join(', ')
                    : 'No employees assigned'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Project Name*</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Assign Employees</label>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {employees.map((emp) => (
                    <label key={emp._id} className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(emp._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, memberIds: [...form.memberIds, emp._id] });
                          } else {
                            setForm({ ...form, memberIds: form.memberIds.filter(id => id !== emp._id) });
                          }
                        }}
                        className="rounded border-[#30363d] text-blue-600 focus:ring-blue-500 bg-[#0d1117] cursor-pointer w-3.5 h-3.5"
                      />
                      <span>{emp.name} ({emp.email})</span>
                    </label>
                  ))}
                  {employees.length === 0 && (
                    <span className="text-xs text-slate-500">No employees found to assign.</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setForm({ name: '', description: '', deadline: '', memberIds: [] }); }} className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 rounded-lg hover:bg-[#21262d] cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Edit Project</h2>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-none outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Project Name*</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Deadline</label>
                <input type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Assign Employees</label>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {employees.map((emp) => (
                    <label key={emp._id} className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={editForm.memberIds.includes(emp._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({ ...editForm, memberIds: [...editForm.memberIds, emp._id] });
                          } else {
                            setEditForm({ ...editForm, memberIds: editForm.memberIds.filter(id => id !== emp._id) });
                          }
                        }}
                        className="rounded border-[#30363d] text-blue-600 focus:ring-blue-500 bg-[#0d1117] cursor-pointer w-3.5 h-3.5"
                      />
                      <span>{emp.name} ({emp.email})</span>
                    </label>
                  ))}
                  {employees.length === 0 && (
                    <span className="text-xs text-slate-500">No employees found to assign.</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingProject(null)} className="flex-1 px-4 py-2 border border-[#30363d] text-slate-300 rounded-lg hover:bg-[#21262d] cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
