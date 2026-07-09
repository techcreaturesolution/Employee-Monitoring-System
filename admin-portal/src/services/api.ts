import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let csrfPromise: Promise<string | null> | null = null;
let cachedTokenForCsrf: string | null = null;

const getCsrfToken = async (forceRefresh = false): Promise<string | null> => {
  const currentToken = localStorage.getItem('ems_token');
  if (!forceRefresh && csrfPromise && cachedTokenForCsrf === currentToken) {
    return csrfPromise;
  }
  
  cachedTokenForCsrf = currentToken;
  csrfPromise = axios.get(`${API_BASE}/csrf-token`, { withCredentials: true })
    .then(res => res.data.csrfToken as string)
    .catch(err => {
      console.error('Failed to fetch CSRF token', err);
      csrfPromise = null;
      return null;
    });
  return csrfPromise;
};

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('ems_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ems_token');
      localStorage.removeItem('ems_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: Record<string, string>) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, string>) => api.put('/auth/profile', data),
  refreshToken: () => api.post('/auth/refresh-token'),
  changePassword: (data: Record<string, string>) => api.put('/auth/change-password', data),
  uploadAvatar: (formData: FormData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const employeeAPI = {
  list: (params?: Record<string, string | number>) => api.get('/employees', { params }),
  add: (data: Record<string, string>) => api.post('/employees', data),
  get: (id: string) => api.get(`/employees/${id}`),
  update: (id: string, data: Record<string, string>) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  regenerateKey: (id: string) => api.post(`/employees/${id}/regenerate-key`),
};

export const attendanceAPI = {
  punchIn: (data?: Record<string, unknown>) => api.post('/attendance/punch-in', data),
  punchOut: (data?: Record<string, unknown>) => api.post('/attendance/punch-out', data),
  startBreak: (data?: Record<string, string>) => api.post('/attendance/break/start', data),
  endBreak: () => api.post('/attendance/break/end'),
  getToday: () => api.get('/attendance/today'),
  getHistory: (params?: Record<string, string | number>) => api.get('/attendance/history', { params }),
  getReport: (params?: Record<string, string>) => api.get('/attendance/report', { params }),
};

export const screenshotAPI = {
  list: (params?: Record<string, string | number>) => api.get('/screenshots', { params }),
  get: (id: string) => api.get(`/screenshots/${id}`),
  delete: (id: string) => api.delete(`/screenshots/${id}`),
  upload: (formData: FormData) =>
    api.post('/screenshots/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const activityAPI = {
  getLogs: (params?: Record<string, string | number>) => api.get('/activity', { params }),
  getSummary: (params?: Record<string, string>) => api.get('/activity/summary', { params }),
  log: (data: Record<string, unknown>) => api.post('/activity/log', data),
};

export const productivityAPI = {
  getStats: (params: { userId: string; date: string }) => api.get('/productivity/stats', { params }),
  getRange: (params: { userId: string; startDate: string; endDate: string }) => api.get('/productivity/range', { params }),
  listKeywords: (params?: { category?: string }) => api.get('/productivity/keywords', { params }),
  createKeyword: (data: { keyword: string; category: string; weight?: number }) => api.post('/productivity/keywords', data),
  updateKeyword: (id: string, data: { category: string; weight?: number }) => api.put(`/productivity/keywords/${id}`, data),
  deleteKeyword: (id: string) => api.delete(`/productivity/keywords/${id}`),
};

export const dashboardAPI = {
  getSuperAdmin: () => api.get('/dashboard/super-admin'),
  getCompany: () => api.get('/dashboard/company'),
  getManager: () => api.get('/dashboard/manager'),
  getEmployee: () => api.get('/dashboard/employee'),
};

export const projectAPI = {
  list: (params?: Record<string, string | number>) => api.get('/projects', { params }),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getTimeEntries: (id: string) => api.get(`/projects/${id}/time-entries`),
  addTimeEntry: (id: string, data: Record<string, unknown>) => api.post(`/projects/${id}/time-entries`, data),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.put('/settings', data),
};

export const tenantAPI = {
  list: (params?: Record<string, string | number>) => api.get('/tenants', { params }),
  get: (id: string) => api.get(`/tenants/${id}`),
  create: (data: Record<string, unknown>) => api.post('/tenants', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
};

export const locationAPI = {
  getLive: () => api.get('/location/live'),
  getHistory: (params?: Record<string, string | number>) => api.get('/location/history', { params }),
  getTrail: (params: { userId: string; date: string }) => api.get('/location/trail', { params }),
  checkGeofence: (data: { latitude: number; longitude: number }) => api.post('/location/geofence-check', data),
  getCurrent: () => api.get('/location/current'),
  updateLocation: (data: { latitude: number; longitude: number; speed?: number; accuracy?: number }) => api.post('/location/update', data),
  getGeofences: () => api.get('/location/geofence'),
};

export const taskAPI = {
  list: (params?: Record<string, string | number | boolean>) => api.get('/tasks', { params }),
  create: (data: { title: string; deadline?: string; userId?: string }) => api.post('/tasks', data),
  update: (id: string, data: { title?: string; deadline?: string; done?: boolean }) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const leaveAPI = {
  apply: (data: Record<string, unknown>) => api.post('/leaves', data),
  myLeaves: () => api.get('/leaves/my'),
  list: (params?: Record<string, string | number>) => api.get('/leaves', { params }),
  updateStatus: (id: string, status: string) => api.put(`/leaves/${id}`, { status }),
  cancel: (id: string) => api.delete(`/leaves/${id}`),
};

export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const reportAPI = {
  getAttendance: (params?: Record<string, string>) => api.get('/reports/attendance', { params }),
  getProductivity: (params?: Record<string, string>) => api.get('/reports/productivity', { params }),
  getActivity: (params?: Record<string, string>) => api.get('/reports/activity', { params }),
  getScreenshots: (params?: Record<string, string>) => api.get('/reports/screenshots', { params }),
  exportPDF: (params?: Record<string, string>) => api.get('/reports/export/pdf', { responseType: 'blob', params }),
  exportExcel: (params?: Record<string, string>) => api.get('/reports/export/excel', { responseType: 'blob', params }),
};

export default api;
