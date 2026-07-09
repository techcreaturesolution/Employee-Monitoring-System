export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'companies' | 'billing' | 'system' | 'security' | 'users';
  priority: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  isRead: boolean;
  isArchived: boolean;
  relatedPage: string;
  actionText: string;
  iconType: 'company' | 'billing' | 'system' | 'security' | 'user' | 'bell';
}

const STORAGE_KEY = 'ems_notifications';

const getInitialNotifications = (): NotificationItem[] => {
  const baseTime = Date.now();
  return [
    // 🏢 Company Notifications
    {
      id: 'NTF-001',
      title: 'New company registered',
      description: 'Tech Creature Solution has signed up on an Enterprise trial plan.',
      category: 'companies',
      priority: 'info',
      timestamp: new Date(baseTime - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      isRead: false,
      isArchived: false,
      relatedPage: '/tenants',
      actionText: 'View Company',
      iconType: 'company'
    },
    {
      id: 'NTF-002',
      title: 'Company subscription expired',
      description: 'Subscription for ABC Pvt Ltd expired on 2026-06-30.',
      category: 'companies',
      priority: 'critical',
      timestamp: new Date(baseTime - 45 * 60 * 1000).toISOString(), // 45m ago
      isRead: false,
      isArchived: false,
      relatedPage: '/subscriptions',
      actionText: 'Renew Subscription',
      iconType: 'company'
    },
    {
      id: 'NTF-003',
      title: 'Company reached employee limit',
      description: 'XYZ Solutions has reached their limit of 120 employees.',
      category: 'companies',
      priority: 'warning',
      timestamp: new Date(baseTime - 4 * 3600 * 1000).toISOString(), // 4h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/tenants',
      actionText: 'Manage Limit',
      iconType: 'company'
    },
    {
      id: 'NTF-004',
      title: 'Company account suspended',
      description: 'Global Corp account suspended due to payment delinquency.',
      category: 'companies',
      priority: 'critical',
      timestamp: new Date(baseTime - 12 * 3600 * 1000).toISOString(), // 12h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/tenants',
      actionText: 'Unlock Account',
      iconType: 'company'
    },
    {
      id: 'NTF-005',
      title: 'New company admin created',
      description: 'Admin Aarav Mehta has been created for ABC Pvt Ltd.',
      category: 'companies',
      priority: 'info',
      timestamp: new Date(baseTime - 18 * 3600 * 1000).toISOString(), // 18h ago
      isRead: true,
      isArchived: false,
      relatedPage: '/users-admins',
      actionText: 'View User',
      iconType: 'company'
    },

    // 💳 Subscription & Billing Alerts
    {
      id: 'NTF-006',
      title: 'Subscription expiring in 7 days',
      description: 'Coastal Ventures plan expires in 7 days. Auto-renew is disabled.',
      category: 'billing',
      priority: 'warning',
      timestamp: new Date(baseTime - 30 * 60 * 1000).toISOString(), // 30m ago
      isRead: false,
      isArchived: false,
      relatedPage: '/subscriptions',
      actionText: 'Renew Subscription',
      iconType: 'billing'
    },
    {
      id: 'NTF-007',
      title: 'Payment failed',
      description: 'Monthly auto-billing payment failed for InnoTech Labs ($199.00).',
      category: 'billing',
      priority: 'critical',
      timestamp: new Date(baseTime - 2.5 * 3600 * 1000).toISOString(), // 2.5h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/subscriptions',
      actionText: 'Retry Payment',
      iconType: 'billing'
    },
    {
      id: 'NTF-008',
      title: 'New plan purchased',
      description: 'Tech Creature upgraded from Starter to Enterprise Plan ($299/mo).',
      category: 'billing',
      priority: 'info',
      timestamp: new Date(baseTime - 6 * 3600 * 1000).toISOString(), // 6h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/subscriptions',
      actionText: 'View Order',
      iconType: 'billing'
    },
    {
      id: 'NTF-009',
      title: 'Renewal completed',
      description: 'Annual renewal completed for ABC Pvt Ltd ($990.00).',
      category: 'billing',
      priority: 'success',
      timestamp: new Date(baseTime - 1 * 24 * 3600 * 1000).toISOString(), // 1 day ago
      isRead: true,
      isArchived: false,
      relatedPage: '/plans-billing',
      actionText: 'View Invoice',
      iconType: 'billing'
    },
    {
      id: 'NTF-010',
      title: 'Invoice generated',
      description: 'Invoice INV-2026-004 generated for XYZ Solutions.',
      category: 'billing',
      priority: 'success',
      timestamp: new Date(baseTime - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
      isRead: true,
      isArchived: false,
      relatedPage: '/plans-billing',
      actionText: 'Download PDF',
      iconType: 'billing'
    },

    // ⚠ System Monitoring Alerts
    {
      id: 'NTF-011',
      title: 'Server CPU usage above 90%',
      description: 'Server CPU reached 94% on production cluster node-prod-02.',
      category: 'system',
      priority: 'critical',
      timestamp: new Date(baseTime - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      isRead: false,
      isArchived: false,
      relatedPage: '/system-monitor',
      actionText: 'Open Monitoring',
      iconType: 'system'
    },
    {
      id: 'NTF-012',
      title: 'Database connection failed',
      description: 'Primary database cluster replica is unreachable or failing connections.',
      category: 'system',
      priority: 'critical',
      timestamp: new Date(baseTime - 8 * 60 * 1000).toISOString(), // 8 mins ago
      isRead: false,
      isArchived: false,
      relatedPage: '/system-monitor',
      actionText: 'Open Monitoring',
      iconType: 'system'
    },
    {
      id: 'NTF-013',
      title: 'High API response time',
      description: 'High response latency (average 1,240ms) detected in the last 15 minutes.',
      category: 'system',
      priority: 'warning',
      timestamp: new Date(baseTime - 1 * 3600 * 1000).toISOString(), // 1h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/system-monitor',
      actionText: 'Inspect Latency',
      iconType: 'system'
    },
    {
      id: 'NTF-014',
      title: 'Storage almost full',
      description: 'Vite screenshots upload volume disk space is at 89% capacity.',
      category: 'system',
      priority: 'warning',
      timestamp: new Date(baseTime - 15 * 3600 * 1000).toISOString(), // 15h ago
      isRead: true,
      isArchived: false,
      relatedPage: '/system-monitor',
      actionText: 'Manage Disk',
      iconType: 'system'
    },
    {
      id: 'NTF-015',
      title: 'Backup failed',
      description: 'Nightly database snapshot backup failed. S3 storage timed out.',
      category: 'system',
      priority: 'critical',
      timestamp: new Date(baseTime - 24 * 3600 * 1000).toISOString(), // 1 day ago
      isRead: false,
      isArchived: false,
      relatedPage: '/system-monitor',
      actionText: 'Trigger Backup',
      iconType: 'system'
    },

    // 🔒 Security Notifications
    {
      id: 'NTF-016',
      title: 'Multiple failed login attempts',
      description: '5 failed login attempts detected on account admin@employeemonitor.com.',
      category: 'security',
      priority: 'warning',
      timestamp: new Date(baseTime - 15 * 60 * 1000).toISOString(), // 15m ago
      isRead: false,
      isArchived: false,
      relatedPage: '/audit-logs',
      actionText: 'View Audit Logs',
      iconType: 'security'
    },
    {
      id: 'NTF-017',
      title: 'Super Admin login from new device',
      description: 'Super Admin logged in from a new Chrome / Linux system (IP: 45.112.28.92).',
      category: 'security',
      priority: 'warning',
      timestamp: new Date(baseTime - 1.2 * 3600 * 1000).toISOString(), // 1.2h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/audit-logs',
      actionText: 'Verify Session',
      iconType: 'security'
    },
    {
      id: 'NTF-018',
      title: 'Password changed',
      description: 'Password was updated successfully for Company Admin (info@techcreature.com).',
      category: 'security',
      priority: 'info',
      timestamp: new Date(baseTime - 8 * 3600 * 1000).toISOString(), // 8h ago
      isRead: true,
      isArchived: false,
      relatedPage: '/audit-logs',
      actionText: 'Audit Action',
      iconType: 'security'
    },
    {
      id: 'NTF-019',
      title: 'Suspicious company activity',
      description: 'Suspicious action: 50 screenshots deleted in under 1 minute by ABC Pvt Ltd.',
      category: 'security',
      priority: 'critical',
      timestamp: new Date(baseTime - 14 * 3600 * 1000).toISOString(), // 14h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/audit-logs',
      actionText: 'View Details',
      iconType: 'security'
    },
    {
      id: 'NTF-020',
      title: 'Role permissions updated',
      description: 'Manager role privileges modified by Super Admin.',
      category: 'security',
      priority: 'warning',
      timestamp: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
      isRead: true,
      isArchived: false,
      relatedPage: '/global-settings',
      actionText: 'Review Roles',
      iconType: 'security'
    },

    // 👤 User & Admin Notifications
    {
      id: 'NTF-021',
      title: 'New company admin created',
      description: 'New company admin "John Doe" created for XYZ Solutions.',
      category: 'users',
      priority: 'info',
      timestamp: new Date(baseTime - 10 * 60 * 1000).toISOString(), // 10 mins ago
      isRead: false,
      isArchived: false,
      relatedPage: '/users-admins',
      actionText: 'View Admin',
      iconType: 'user'
    },
    {
      id: 'NTF-022',
      title: 'Admin account deactivated',
      description: 'Admin account HR Admin at Global Corp has been deactivated.',
      category: 'users',
      priority: 'warning',
      timestamp: new Date(baseTime - 3.5 * 3600 * 1000).toISOString(), // 3.5h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/users-admins',
      actionText: 'View Status',
      iconType: 'user'
    },
    {
      id: 'NTF-023',
      title: 'Employee limit exceeded',
      description: 'Tenant ABC Pvt Ltd attempted to add employee but limit is exceeded.',
      category: 'users',
      priority: 'critical',
      timestamp: new Date(baseTime - 5 * 3600 * 1000).toISOString(), // 5h ago
      isRead: false,
      isArchived: false,
      relatedPage: '/tenants',
      actionText: 'Increase Limit',
      iconType: 'user'
    },
    {
      id: 'NTF-024',
      title: 'Bulk employee import completed',
      description: 'Successfully imported 45 employees via CSV file for Tech Creature.',
      category: 'users',
      priority: 'success',
      timestamp: new Date(baseTime - 20 * 3600 * 1000).toISOString(), // 20h ago
      isRead: true,
      isArchived: false,
      relatedPage: '/employees',
      actionText: 'View Employees',
      iconType: 'user'
    },
    {
      id: 'NTF-025',
      title: 'Admin login approved',
      description: 'New administrator permission set successfully authorized.',
      category: 'users',
      priority: 'success',
      timestamp: new Date(baseTime - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
      isRead: true,
      isArchived: false,
      relatedPage: '/users-admins',
      actionText: 'Verify Rights',
      iconType: 'user'
    }
  ];
};

export const getNotifications = (): NotificationItem[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = getInitialNotifications();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse notifications', error);
    return [];
  }
};

export const saveNotifications = (items: NotificationItem[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead' | 'isArchived'>): NotificationItem => {
  const list = getNotifications();
  const newItem: NotificationItem = {
    ...item,
    id: `NTF-${String(Date.now()).slice(-6)}`,
    timestamp: new Date().toISOString(),
    isRead: false,
    isArchived: false
  };
  saveNotifications([newItem, ...list]);
  return newItem;
};

export const markAsRead = (id: string, isRead: boolean = true): NotificationItem[] => {
  const list = getNotifications();
  const updated = list.map(item => item.id === id ? { ...item, isRead } : item);
  saveNotifications(updated);
  return updated;
};

export const markAllAsRead = (): NotificationItem[] => {
  const list = getNotifications();
  const updated = list.map(item => ({ ...item, isRead: true }));
  saveNotifications(updated);
  return updated;
};

export const archiveNotification = (id: string, isArchived: boolean = true): NotificationItem[] => {
  const list = getNotifications();
  const updated = list.map(item => item.id === id ? { ...item, isArchived } : item);
  saveNotifications(updated);
  return updated;
};

export const deleteNotification = (id: string): NotificationItem[] => {
  const list = getNotifications();
  const updated = list.filter(item => item.id !== id);
  saveNotifications(updated);
  return updated;
};
