import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  PlusCircle,
  Clock,
  User,
  Folder,
  BarChart,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminPage from './SuperAdminPage';
import { taskAPI, employeeAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId?: string;
  assignee: string;
  userId?: string;
  deadline: string;
  status: 'todo' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'list';
  const activeTab = (user?.role === 'employee' && rawTab !== 'list') ? 'list' : rawTab;

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [proj, setProj] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const fetchTasks = async () => {
    if (user?.role === 'super_admin') {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await taskAPI.list();
      const backendTasks = (res.data.data || []).map((t: any) => ({
        id: t._id,
        title: t.title,
        description: t.description || 'No description provided.',
        project: t.project || 'General',
        assignee: t.userId?.name || 'Unassigned',
        userId: typeof t.userId === 'object' && t.userId ? (t.userId._id || t.userId.id) : t.userId,
        deadline: t.deadline || new Date(t.createdAt || Date.now()).toISOString().split('T')[0],
        status: t.done ? 'completed' : 'todo', // backend task has t.done. Done translates to completed, else todo
        priority: t.priority || 'medium'
      }));

      const filteredTasks = user?.role === 'employee'
        ? backendTasks.filter((t: any) => (t.userId === user?.id || t.userId === (user as any)?._id) && t.status !== 'completed')
        : backendTasks;

      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (user?.role === 'super_admin') {
      setEmployees([]);
      return;
    }
    try {
      const res = await employeeAPI.list({ limit: 100 });
      const list = res.data.data.employees || [];
      setEmployees(list);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchProjects = async () => {
    if (user?.role === 'super_admin') {
      setProjects([]);
      return;
    }
    try {
      const res = await projectAPI.list({});
      const fetchedProjects = res.data.data.projects || [];
      const deletedIds = JSON.parse(localStorage.getItem('ems_deleted_project_ids') || '[]');
      const activeProjects = fetchedProjects.filter((p: any) => !deletedIds.includes(p._id));
      
      const savedMembers = JSON.parse(localStorage.getItem('ems_project_members') || '{}');
      
      const projectsMerged = activeProjects.map((p: any) => {
        let resolvedMembers = p.members || [];
        const localMemberIds = savedMembers[p._id] || [];
        if (resolvedMembers.length === 0 && localMemberIds.length > 0) {
          resolvedMembers = localMemberIds;
        } else {
          resolvedMembers = resolvedMembers.map((m: any) => typeof m === 'object' ? (m._id || m.id) : m);
        }
        return { ...p, members: resolvedMembers };
      });
      setProjects(projectsMerged);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchEmployees();
      fetchProjects();
    }
  }, [user]);

  const availableEmployees = useMemo(() => {
    if (!proj) return [];
    const selectedProject = projects.find(p => p._id === proj || p.id === proj);
    if (!selectedProject) return [];
    
    const memberIds = selectedProject.members || [];
    return employees.filter(emp => memberIds.includes(emp._id || emp.id));
  }, [proj, projects, employees]);

  useEffect(() => {
    if (availableEmployees.length > 0) {
      // If current assignee is not in available employees, auto-select first one
      if (!availableEmployees.find(e => (e._id || e.id) === assignee)) {
        setAssignee(availableEmployees[0]._id || availableEmployees[0].id);
      }
    } else {
      setAssignee('');
    }
  }, [availableEmployees, assignee]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) {
      toast.error('Please enter title and deadline');
      return;
    }
    try {
      await taskAPI.create({
        title,
        deadline,
        userId: assignee || undefined
      });
      toast.success('Task created successfully!');
      setTitle('');
      setDesc('');
      setDeadline('');
      setSearchParams({ tab: 'list' });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleMoveStatus = async (id: string, newStatus: TaskItem['status']) => {
    try {
      await taskAPI.update(id, { done: newStatus === 'completed' });
      toast.success(`Task status updated!`);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setTitle(task.title);
    setDesc(task.description);
    setProj(task.projectId || '');
    setAssignee(task.userId || '');
    setDeadline(task.deadline);
    setPriority(task.priority);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await taskAPI.update(editingTask.id, {
        title,
        deadline,
        userId: assignee || undefined,
        description: desc,
      } as any);
      toast.success('Task updated successfully!');
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.delete(id);
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const populatedTasks = useMemo(() => {
    return tasks.map(t => {
      let assigneeName = t.assignee;
      if (assigneeName === 'Unassigned' && t.userId && employees.length > 0) {
        const emp = employees.find(e => (e.id || e._id) === t.userId);
        if (emp) assigneeName = emp.name;
      }
      return { ...t, assignee: assigneeName };
    });
  }, [tasks, employees]);

  // Report statistics
  const stats = useMemo(() => {
    const total = populatedTasks.length;
    const completed = populatedTasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    
    const overdue = populatedTasks.filter(t => {
      const isPast = new Date(t.deadline).getTime() < Date.now();
      return isPast && t.status !== 'completed';
    }).length;

    const chartData = [
      { name: 'To Do', value: populatedTasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
      { name: 'Completed', value: populatedTasks.filter(t => t.status === 'completed').length, color: '#10b981' }
    ];

    return { total, completed, pending, overdue, chartData };
  }, [populatedTasks]);

  const priorityColors = {
    low: 'bg-slate-500/10 text-slate-400 border border-slate-500/25',
    medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    high: 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
  };

  return (
    <SuperAdminPage
      title="Tasks"
      subtitle="Manage projects tasks, Kanban statuses, assignments, and progression stats"
      icon={FileText}
      accentColor="text-yellow-400"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto">
          {[
            { id: 'list', label: 'All Tasks / Status Board' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-400 font-bold'
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
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mb-3 animate-pulse" />
              <p className="text-slate-400 text-xs">Loading tasks...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action Row */}
              {user?.role !== 'employee' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSearchParams({ tab: 'create' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/20 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Task
                  </button>
                </div>
              )}

              {/* Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* To Do */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">To Do</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      {populatedTasks.filter(t => t.status === 'todo').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {populatedTasks.filter(t => t.status === 'todo').map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        priorityColors={priorityColors} 
                        onMove={user?.role === 'employee' ? handleMoveStatus : undefined} 
                        onEdit={user?.role !== 'employee' ? () => openEditModal(task) : undefined}
                        onDelete={user?.role !== 'employee' ? () => handleDeleteTask(task.id) : undefined}
                      />
                    ))}
                    {populatedTasks.filter(t => t.status === 'todo').length === 0 && <EmptyColumn />}
                  </div>
                </div>

                {/* Completed */}
                {user?.role !== 'employee' && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {populatedTasks.filter(t => t.status === 'completed').length}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {populatedTasks.filter(t => t.status === 'completed').map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          priorityColors={priorityColors} 
                          onMove={user?.role === 'employee' ? handleMoveStatus : undefined}
                          onEdit={() => openEditModal(task)}
                          onDelete={() => handleDeleteTask(task.id)}
                        />
                      ))}
                      {populatedTasks.filter(t => t.status === 'completed').length === 0 && <EmptyColumn />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'create' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 max-w-xl shadow-lg">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-yellow-400" />
              Define & Assign Project Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                <div className="relative">
                  <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Task Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe task parameters and deliverables..."
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white h-24 focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project</label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={proj}
                      onChange={(e) => setProj(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Select a Project</option>
                      {projects.map(p => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Assignee</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer"
                      disabled={!proj || availableEmployees.length === 0}
                    >
                      {!proj ? (
                        <option value="">Select a project first</option>
                      ) : availableEmployees.length === 0 ? (
                        <option value="">No employees assigned</option>
                      ) : null}
                      {availableEmployees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.id || emp._id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
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
                  className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/20 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Tasks</p>
                  <CheckSquare className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Completed</p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Pending</p>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4.5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Overdue Tasks</p>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl font-bold text-rose-400">{stats.overdue}</p>
              </div>
            </div>

            {/* Chart Card */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg max-w-2xl">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-yellow-400" />
                Distribution of Task Statuses
              </h2>
              <div className="w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsBarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e2e8f0', fontSize: 11, borderRadius: 8 }} />
                    <RechartsBar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsBar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Edit Task</h2>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white h-24 focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project</label>
                  <select
                    value={proj}
                    onChange={(e) => setProj(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select a Project</option>
                    {projects.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Assignee</label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-300 focus:ring-2 focus:ring-yellow-500 outline-none cursor-pointer"
                  >
                    <option value="">Select Assignee</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id || emp._id} value={emp.id || emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-transparent hover:bg-[#21262d] border border-[#30363d] text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/20 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </SuperAdminPage>
  );
};

// Sub-component: Task Card
const TaskCard: React.FC<{
  task: TaskItem;
  priorityColors: Record<string, string>;
  onMove?: (id: string, status: TaskItem['status']) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ task, priorityColors, onMove, onEdit, onDelete }) => {
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 space-y-2.5 hover:border-slate-500 transition-all shadow relative group">
      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
          {onEdit && onDelete && (
            <div className="flex gap-1.5">
              <button onClick={onEdit} className="bg-[#161b22] text-slate-300 hover:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-[#30363d] hover:border-yellow-500/50 cursor-pointer transition-colors">Edit</button>
              <button onClick={onDelete} className="bg-[#161b22] text-slate-300 hover:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-[#30363d] hover:border-red-500/50 cursor-pointer transition-colors">Delete</button>
            </div>
          )}
          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        </div>
        <h4 className="text-xs font-bold text-white leading-tight truncate" title={task.title}>{task.title}</h4>
        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-snug">{task.description}</p>
      </div>

      <div className="border-t border-[#30363d] pt-2 flex items-center justify-between text-[9px] text-slate-500 font-semibold">
        <span className="flex items-center gap-1.5 truncate max-w-[120px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20" title={`Assignee: ${task.assignee}`}>
          <User className="w-3 h-3 text-blue-400" />
          <span className="text-white font-bold text-[10px] tracking-wide">{task.assignee}</span>
        </span>
        <span className="flex items-center gap-0.5" title={`Deadline: ${task.deadline}`}>
          <Clock className="w-3 h-3 text-slate-600" />
          {task.deadline.slice(5)}
        </span>
      </div>

      {/* Quick Move Status Actions */}
      {onMove && (
        <div className="flex border-t border-[#30363d] pt-1.5 gap-1">
          {task.status !== 'todo' && (
            <button
              onClick={() => onMove(task.id, 'todo')}
              className="flex-1 text-center py-1 bg-slate-500/10 hover:bg-slate-500/25 border border-slate-500/20 rounded text-[9px] text-slate-300 font-bold transition-all cursor-pointer"
            >
              Reopen Task
            </button>
          )}
          {task.status !== 'completed' && (
            <button
              onClick={() => onMove(task.id, 'completed')}
              className="flex-1 text-center py-1 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold transition-all cursor-pointer"
            >
              Mark as Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EmptyColumn: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-slate-600 border border-dashed border-[#30363d] rounded-xl text-center">
    <CheckSquare className="w-5 h-5 opacity-40 mb-1" />
    <span className="text-[10px] font-medium">No tasks in column</span>
  </div>
);

export default Tasks;
