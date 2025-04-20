import axios from 'axios';

// Use the same server URL as the socket connection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // withCredentials: 'include',
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Interviews API
export const interviewsAPI = {
  getAll: () => api.get('/api/interviews'),
  getById: (id) => api.get(`/api/interviews/${id}`),
  create: (interviewData) => api.post('/api/interviews', interviewData),
  update: (id, interviewData) =>
    api.put(`/api/interviews/${id}`, interviewData),
  delete: (id) => api.delete(`/api/interviews/${id}`),
};

// Metrics API - add a direct method for sending process data
export const metricsAPI = {
  sendProcesses: (roomId, processData) =>
    api.post(`/send_processes/${roomId}`, processData),
};

export default api;
