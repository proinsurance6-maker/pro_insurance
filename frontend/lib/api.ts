import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: any) =>
    api.post('/auth/register', data),
  
  getMe: () =>
    api.get('/auth/me'),
};

// Policy APIs
export const policyAPI = {
  getAll: (params?: any) =>
    api.get('/policies', { params }),
  
  getById: (id: string) =>
    api.get(`/policies/${id}`),
  
  create: (data: any) =>
    api.post('/policies', data),
  
  update: (id: string, data: any) =>
    api.put(`/policies/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/policies/${id}`),
  
  bulkUpload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/policies/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Commission APIs
export const commissionAPI = {
  getAll: (params?: any) =>
    api.get('/commissions', { params }),
  
  getSummary: () =>
    api.get('/commissions/summary'),
  
  updatePayment: (id: string, data: any) =>
    api.put(`/commissions/${id}/payment`, data),
};

// Renewal APIs
export const renewalAPI = {
  getAll: (params?: any) =>
    api.get('/renewals', { params }),
  
  getById: (id: string) =>
    api.get(`/renewals/${id}`),
  
  markAsRenewed: (id: string, data: any) =>
    api.put(`/renewals/${id}/complete`, data),
};

// Sub-Broker APIs (Admin)
export const subBrokerAPI = {
  getAll: () =>
    api.get('/sub-brokers'),
  
  getById: (id: string) =>
    api.get(`/sub-brokers/${id}`),
  
  create: (data: any) =>
    api.post('/sub-brokers', data),
  
  update: (id: string, data: any) =>
    api.put(`/sub-brokers/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/sub-brokers/${id}`),
};

// Company APIs
export const companyAPI = {
  getAll: () =>
    api.get('/companies'),
  
  getById: (id: string) =>
    api.get(`/companies/${id}`),
  
  create: (data: any) =>
    api.post('/companies', data),
  
  update: (id: string, data: any) =>
    api.put(`/companies/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/companies/${id}`),
};

// Commission Rule APIs (Admin)
export const commissionRuleAPI = {
  getAll: () =>
    api.get('/commission-rules'),
  
  create: (data: any) =>
    api.post('/commission-rules', data),
  
  update: (id: string, data: any) =>
    api.put(`/commission-rules/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/commission-rules/${id}`),
};

export default api;
