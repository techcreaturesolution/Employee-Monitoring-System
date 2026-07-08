import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

export const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const serverUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor to attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ems_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry if the 401 was from the refresh endpoint itself
      if (originalRequest.url === '/auth/refresh-token') {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_refresh_token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const localRefreshToken = localStorage.getItem('ems_refresh_token');
        const refreshRes = await axios.post(
          `${API_BASE}/auth/refresh-token`,
          { refreshToken: localRefreshToken },
          {
            headers: { 'x-refresh-token': localRefreshToken || '' },
            withCredentials: true,
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = refreshRes.data.data || {};
        if (accessToken) {
          localStorage.setItem('ems_token', accessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('ems_refresh_token', newRefreshToken);
        }

        isRefreshing = false;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError as Error);
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_refresh_token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: Record<string, string>) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
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

export const locationAPI = {
  getLive: () => api.get('/location/live'),
  getHistory: (params?: Record<string, string | number>) => api.get('/location/history', { params }),
  getTrail: (params: { userId: string; date: string }) => api.get('/location/trail', { params }),
  checkGeofence: (data: { latitude: number; longitude: number }) => api.post('/location/geofence-check', data),
};

export const subscriptionAPI = {
  getStatus: () => api.get('/subscriptions/status'),
  create: (plan: string) => api.post('/subscriptions/create', { plan }),
};

export default api;
