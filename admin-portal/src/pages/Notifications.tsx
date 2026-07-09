import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  ExternalLink,
  Building2,
  CreditCard,
  Monitor,
  Shield,
  User,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  X,
  RotateCcw,
  MessageSquare,
  FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import SuperAdminPage from './SuperAdminPage';
import { getNotifications, NotificationItem as AdminNotificationItem } from '../services/notificationService';

// Employee Notification Type
interface EmployeeNotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'task' | 'attendance' | 'system' | 'manager';
  priority: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  isRead: boolean;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  // Active Category Tab
  const defaultTab = isAdmin ? 'all' : 'all-emp';
  const activeTab = searchParams.get('tab') || defaultTab;

  // Notification States
  const [adminNotifications, setAdminNotifications] = useState<AdminNotificationItem[]>([]);
  const [empNotifications, setEmpNotifications] = useState<EmployeeNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Common filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');

  const mapNotification = (apiNotif: any) => ({
    id: apiNotif._id || apiNotif.id,
    title: apiNotif.title,
    description: apiNotif.message || apiNotif.description || '',
    category: apiNotif.category || 'system',
    priority: apiNotif.priority || 'info',
    timestamp: apiNotif.createdAt || apiNotif.timestamp || new Date().toISOString(),
    isRead: apiNotif.read !== undefined ? apiNotif.read : (apiNotif.isRead || false),
    isArchived: apiNotif.isArchived || false,
    relatedPage: apiNotif.link || apiNotif.relatedPage || '',
    actionText: apiNotif.actionText || 'View Details',
    iconType: apiNotif.iconType || 'bell'
  });

  // Load Admin Notifications
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list();
      const list = res.data?.data?.notifications || res.data?.data || [];
      setAdminNotifications(list.map(mapNotification));
    } catch (err) {
      console.error('Failed to load admin notifications:', err);
      toast.error('Failed to load notifications from server.');
      setAdminNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Load Employee Notifications
  const loadEmployeeData = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list();
      const list = res.data?.data?.notifications || res.data?.data || [];
      setEmpNotifications(list.map(mapNotification));
    } catch (err) {
      console.error('GET /api/notifications failed.', err);
      toast.error('Failed to load notifications from server.');
      setEmpNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        loadAdminData();
      } else {
        loadEmployeeData();
      }
    }
  }, [user, isAdmin]);

  // Actions for Employees
  const handleEmpMarkRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      toast.success('Notification marked as read');
      loadEmployeeData();
    } catch (err) {
      console.error('API markRead failed', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleEmpMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      toast.success('All notifications marked as read');
      loadEmployeeData();
    } catch (err) {
      console.error('API markAllRead failed', err);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleEmpDelete = async (id: string) => {
    try {
      await notificationAPI.delete(id);
      toast.success('Notification deleted');
      loadEmployeeData();
    } catch (err) {
      console.error('API delete failed', err);
      toast.error('Failed to delete notification');
    }
  };

  // Actions for Admins
  const handleAdminMarkRead = async (id: string, currentRead: boolean) => {
    try {
      await notificationAPI.markRead(id);
      toast.success(currentRead ? 'Notification marked as unread' : 'Notification marked as read');
      loadAdminData();
    } catch (err) {
      console.error('API markRead failed', err);
      toast.error('Failed to update notification');
    }
  };

  const handleAdminDelete = async (id: string) => {
    try {
      await notificationAPI.delete(id);
      toast.success('Notification deleted');
      loadAdminData();
    } catch (err) {
      console.error('API delete failed', err);
      toast.error('Failed to delete notification');
    }
  };

  // Filtered lists
  const filteredEmpNotifications = useMemo(() => {
    return empNotifications.filter(n => {
      const categoryMatch =
        activeTab === 'all-emp' ||
        (activeTab === 'tasks-emp' && n.category === 'task') ||
        (activeTab === 'attendance-emp' && n.category === 'attendance') ||
        (activeTab === 'system-emp' && n.category === 'system') ||
        (activeTab === 'manager-emp' && n.category === 'manager');

      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'unread' && !n.isRead) ||
        (filterStatus === 'read' && n.isRead);

      return categoryMatch && statusMatch;
    });
  }, [empNotifications, activeTab, filterStatus]);

  const filteredAdminNotifications = useMemo(() => {
    return adminNotifications.filter(n => {
      const categoryMatch = activeTab === 'all' || n.category === activeTab;
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'unread' && !n.isRead) ||
        (filterStatus === 'read' && n.isRead);
      return categoryMatch && statusMatch && !n.isArchived;
    });
  }, [adminNotifications, activeTab, filterStatus]);

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Helper colors
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'manager':
        return <MessageSquare className="w-4 h-4 text-red-400" />;
      default:
        return <Monitor className="w-4 h-4 text-emerald-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-slate-400 text-sm">Loading Notifications...</p>
      </div>
    );
  }

  // ════════ EMPLOYEE VIEW ════════
  if (!isAdmin) {
    const unreadCount = empNotifications.filter(n => !n.isRead).length;

    return (
      <div className="bg-[#0d1117] min-h-full text-white space-y-6">
        <Toaster position="top-right" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5.5 h-5.5 text-blue-500" /> Notifications ({unreadCount} unread)
            </h1>
            <p className="text-xs text-slate-400">Receive alert summaries for task assignments, late punch records, and manager broadcasts</p>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleEmpMarkAllRead}
                className="flex items-center gap-1 px-3.5 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/25 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" /> Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all-emp', label: 'All Logs', icon: Bell },
            { id: 'tasks-emp', label: 'Tasks Alerts', icon: FileText },
            { id: 'attendance-emp', label: 'Attendance', icon: Clock },
            { id: 'system-emp', label: 'System status', icon: Monitor },
            { id: 'manager-emp', label: 'Manager Broadcasts', icon: MessageSquare }
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

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'unread', 'read'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold'
                  : 'bg-transparent border-[#30363d] text-slate-400 hover:text-white'
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Logs Feed */}
        <div className="space-y-3">
          {filteredEmpNotifications.length > 0 ? (
            filteredEmpNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 bg-[#161b22] border rounded-2xl transition-all flex items-start gap-4 hover:border-slate-700 ${
                  notif.isRead ? 'border-[#30363d] opacity-75' : 'border-blue-500/40 bg-blue-500/5 shadow-md shadow-blue-950/5'
                }`}
              >
                <div className={`p-2 rounded-xl bg-[#0d1117] border border-[#30363d] shrink-0 mt-0.5`}>
                  {getCategoryIcon(notif.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                        {notif.title}
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.description}</p>
                    </div>

                    <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap shrink-0">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#21262d] text-[9px] font-bold uppercase">
                    <span className={`px-2 py-0.5 rounded border ${getPriorityStyle(notif.priority)}`}>
                      {notif.priority}
                    </span>
                    <span className="text-slate-500">Category: {notif.category}</span>
                    
                    <div className="flex-1" />

                    <div className="flex items-center gap-1.5">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleEmpMarkRead(notif.id)}
                          className="flex items-center gap-0.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-md cursor-pointer transition-all"
                        >
                          <Check className="w-3 h-3" /> Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => handleEmpDelete(notif.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer transition-all"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <Bell className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="text-xs text-slate-400 font-bold">No notifications found</p>
              <p className="text-[10px] text-slate-500 mt-1">They will appear here when alerts are triggered.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════ ADMIN VIEW ════════
  return (
    <SuperAdminPage
      title="Notifications Management"
      subtitle="Configure, audit, and broadcast alerts across corporate accounts"
      icon={Bell}
      accentColor="text-blue-400"
    >
      <div className="space-y-6">
        {/* TABS */}
        <div className="flex border-b border-[#30363d] gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Messages' },
            { id: 'companies', label: 'Company Alerts' },
            { id: 'billing', label: 'Billing Events' },
            { id: 'system', label: 'System status' },
            { id: 'security', label: 'Security & Auth' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'unread', 'read'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold'
                  : 'bg-transparent border-[#30363d] text-slate-400 hover:text-white'
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Logs Feed */}
        <div className="space-y-3">
          {filteredAdminNotifications.length > 0 ? (
            filteredAdminNotifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl flex gap-4 text-xs"
              >
                <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded-xl shrink-0 mt-0.5 text-slate-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white leading-tight">{notif.title}</h3>
                    <span className="text-[10px] text-slate-500 font-semibold shrink-0 ml-4">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 leading-relaxed">{notif.description}</p>
                  
                  <div className="mt-3 flex items-center justify-between border-t border-[#21262d] pt-3 text-[9px] font-bold uppercase text-slate-500">
                    <span className={`px-2 py-0.5 rounded border ${getPriorityStyle(notif.priority)}`}>
                      {notif.priority}
                    </span>
                    <span>Category: {notif.category}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminMarkRead(notif.id, notif.isRead)}
                        className="text-blue-400 hover:underline cursor-pointer"
                      >
                        {notif.isRead ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      <button
                        onClick={() => handleAdminDelete(notif.id)}
                        className="text-red-400 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Bell className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p>No company logs found.</p>
            </div>
          )}
        </div>
      </div>
    </SuperAdminPage>
  );
};

export default NotificationsPage;
