import axios from 'axios';

// Base client for the FastAPI/Flask backend.
// Vite proxies "/api" to http://localhost:8000 in dev (see vite.config.js).
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token (if present) to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

/* ---------- Endpoint helpers (wire these to your backend routes) ---------- */

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
};

export const projectApi = {
  list: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  get: (id) => api.get(`/projects/${id}`),
  remove: (id) => api.delete(`/projects/${id}`),
};

export const aiApi = {
  generatePlan: (plotDetails) => api.post('/ai/generate-plan', plotDetails),
  chat: (message, history) => api.post('/ai/chat', { message, history }),
};

export const estimationApi = {
  cost: (projectId) => api.get(`/estimation/cost/${projectId}`),
  materials: (projectId) => api.get(`/estimation/materials/${projectId}`),
};

export const reportApi = {
  generatePdf: (projectId) =>
    api.get(`/reports/${projectId}/pdf`, { responseType: 'blob' }),
};

export const adminApi = {
  users: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  projects: () => api.get('/admin/projects'),
  materialPrices: () => api.get('/admin/material-prices'),
  updateMaterialPrice: (id, data) =>
    api.put(`/admin/material-prices/${id}`, data),
  analytics: () => api.get('/admin/analytics'),
};
