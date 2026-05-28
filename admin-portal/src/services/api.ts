import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ems_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ems_token');
      localStorage.removeItem('ems_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: Record<string, string>) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, string>) => api.put('/auth/profile', data),
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
};

export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getEmployee: () => api.get('/dashboard/employee'),
};

export const projectAPI = {
  list: (params?: Record<string, string | number>) => api.get('/projects', { params }),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
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
  update: (id: string, data: Record<string, unknown>) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
};

export default api;
