export interface AuditLog {
  id: string;
  action: 'Admin Login' | 'Company Created' | 'Subscription Changed' | 'Employee Deleted';
  actor: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

const STORAGE_KEY = 'ems_audit_logs';

const getDeviceString = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome / Windows';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari / macOS';
  if (ua.includes('Firefox')) return 'Firefox / Linux';
  return 'Web Browser / OS';
};

const getRandomIP = (): string => {
  const ips = ['157.48.192.45', '103.45.2.19', '122.160.43.10', '192.168.1.104', '45.112.28.92'];
  return ips[Math.floor(Math.random() * ips.length)];
};

const getInitialLogs = (): AuditLog[] => {
  const baseTime = Date.now();
  return [
    {
      id: 'LOG-001',
      action: 'Admin Login',
      actor: 'admin@emloyeemonitor.com',
      details: 'Super Admin logged in successfully',
      timestamp: new Date(baseTime - 5 * 60 * 1000).toISOString(), // 5 mins ago
      ipAddress: '157.48.192.45',
      device: 'Chrome / Windows 11',
      severity: 'success',
    },
    {
      id: 'LOG-002',
      action: 'Employee Deleted',
      actor: 'admin@democompany.com',
      details: 'Employee "John Doe" (john.doe@democompany.com) deactivated',
      timestamp: new Date(baseTime - 2 * 3600 * 1000).toISOString(), // 2 hours ago
      ipAddress: '103.45.2.19',
      device: 'Firefox / macOS',
      severity: 'danger',
    },
    {
      id: 'LOG-003',
      action: 'Subscription Changed',
      actor: 'admin@emloyeemonitor.com',
      details: 'Subscription for "XYZ Solutions" upgraded to Business ($199/mo)',
      timestamp: new Date(baseTime - 24 * 3600 * 1000).toISOString(), // 1 day ago
      ipAddress: '157.48.192.45',
      device: 'Chrome / Windows 11',
      severity: 'warning',
    },
    {
      id: 'LOG-004',
      action: 'Company Created',
      actor: 'admin@emloyeemonitor.com',
      details: 'Company "InnoTech Labs" created successfully with trial plan',
      timestamp: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
      ipAddress: '157.48.192.45',
      device: 'Chrome / Windows 11',
      severity: 'info',
    },
    {
      id: 'LOG-005',
      action: 'Admin Login',
      actor: 'admin@democompany.com',
      details: 'Company Admin logged in successfully',
      timestamp: new Date(baseTime - 4 * 24 * 3600 * 1000).toISOString(), // 4 days ago
      ipAddress: '103.45.2.19',
      device: 'Safari / macOS',
      severity: 'success',
    },
    {
      id: 'LOG-006',
      action: 'Subscription Changed',
      actor: 'admin@emloyeemonitor.com',
      details: 'Subscription for "Global Corp" suspended due to past due payment',
      timestamp: new Date(baseTime - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
      ipAddress: '157.48.192.45',
      device: 'Chrome / Windows 11',
      severity: 'danger',
    },
    {
      id: 'LOG-007',
      action: 'Company Created',
      actor: 'admin@emloyeemonitor.com',
      details: 'Company "XYZ Solutions" registered on Enterprise plan',
      timestamp: new Date(baseTime - 10 * 24 * 3600 * 1000).toISOString(), // 10 days ago
      ipAddress: '122.160.43.10',
      device: 'Chrome / Linux',
      severity: 'info',
    }
  ];
};

export const getAuditLogs = (): AuditLog[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = getInitialLogs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse audit logs from storage', error);
    return [];
  }
};

export const addAuditLog = (entry: {
  action: AuditLog['action'];
  details: string;
  severity: AuditLog['severity'];
  actor?: string;
}): AuditLog => {
  const logs = getAuditLogs();
  
  // Try to find current logged-in user if actor not explicitly provided
  let actorEmail = entry.actor || 'system';
  if (!entry.actor) {
    const userStr = localStorage.getItem('ems_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.email) {
          actorEmail = u.email;
        }
      } catch (err) {
        // ignore
      }
    }
  }

  const newLog: AuditLog = {
    id: `LOG-${String(Date.now()).slice(-6)}`,
    action: entry.action,
    actor: actorEmail,
    details: entry.details,
    timestamp: new Date().toISOString(),
    ipAddress: getRandomIP(),
    device: getDeviceString(),
    severity: entry.severity,
  };

  const updatedLogs = [newLog, ...logs];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
  return newLog;
};

export const clearAuditLogs = (): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
};
