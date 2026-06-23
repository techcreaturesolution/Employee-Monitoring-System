import axios, { AxiosInstance } from 'axios';

const API_BASE = 'http://localhost:5000/api/mobile';

let authToken: string | null = null;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const mobileAPI = {
  login: (data: { email: string; password: string }) => api.post('/login', data),

  punchIn: (data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
    workMode?: string;
  }) => api.post('/punch-in', data),

  punchOut: (data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
  }) => api.post('/punch-out', data),

  updateWorkMode: (workMode: string) => api.put('/work-mode', { workMode }),

  getConfig: () => api.get('/config'),

  getDashboard: () => api.get('/dashboard'),

  trackLocation: (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    source?: string;
    batteryLevel?: number;
    networkType?: string;
  }) => api.post('/location/track', data),

  batchTrackLocations: (locations: Array<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  }>) => api.post('/location/batch', { locations }),

  checkGeofence: (data: { latitude: number; longitude: number }) =>
    api.post('/location/geofence-check', data),
};

export default api;
