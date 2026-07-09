export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  tenantId: string;
  department: string;
  designation: string;
  avatar: string;
  phone: string;
  employeeId: string;
  status: 'active' | 'inactive' | 'suspended';
  agentKey: string;
  lastActive: string;
  isOnline: boolean;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    updatedAt: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  screenshotInterval: number;
  trackApps: boolean;
  trackUrls: boolean;
  blurScreenshots: boolean;
  maxEmployees: number;
  workStartTime: string;
  workEndTime: string;
  timezone: string;
  allowManualPunch: boolean;
  autoStopTracking: boolean;
  idleTimeThreshold: number;
  enableGeofencing: boolean;
  officeLocations: OfficeLocation[];
  mobileLocationInterval: number;
  requireLocationForPunch: boolean;
}

export interface OfficeLocation {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface Attendance {
  _id: string;
  userId: User | string;
  tenantId: string;
  date: string;
  workMode: 'office' | 'wfh' | 'field';
  punchIn: PunchRecord;
  punchOut: PunchRecord;
  breaks: Break[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  overtimeMinutes: number;
  status: string;
}

export interface PunchRecord {
  time: string;
  ip: string;
  location: { latitude: number; longitude: number; address: string; accuracy: number };
  screenshotUrl: string;
  method: string;
  isInsideGeofence: boolean;
}

export interface Break {
  startTime: string;
  endTime: string;
  duration: number;
  reason: string;
}

export interface Screenshot {
  _id: string;
  userId: User | string;
  tenantId: string;
  timestamp: string;
  imageUrl: string;
  thumbnailUrl: string;
  activeApp: string;
  windowTitle: string;
  productivityTag: string;
  metadata: { resolution: string; fileSize: number; format: string };
}

export interface ActivityLog {
  _id: string;
  userId: User | string;
  appName: string;
  windowTitle: string;
  url: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  deadline?: string;
  members: User[];
  status: string;
  totalTrackedMinutes: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayPresent: number;
  todayAbsent: number;
  todayScreenshots: number;
  onlineNow: number;
  activeProjects?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LocationLog {
  _id: string;
  userId: User | string;
  tenantId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  source: 'mobile' | 'web' | 'agent';
  workMode: 'office' | 'wfh' | 'field';
  isInsideGeofence: boolean;
  batteryLevel: number;
  networkType: string;
  timestamp: string;
}

export interface LiveEmployeeLocation {
  userId: string;
  name: string;
  email: string;
  department: string;
  workMode: 'office' | 'wfh' | 'field';
  location: {
    latitude: number;
    longitude: number;
    address: string;
    updatedAt: string;
  };
  isOnline: boolean;
  lastActive: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface LeaveRequest {
  _id: string;
  userId: User | string;
  leaveType: 'casual' | 'sick' | 'annual' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}
