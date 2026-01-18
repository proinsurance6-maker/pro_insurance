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
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// AUTH APIs
// ==========================================
export const authAPI = {
  // Agent Signup with PIN
  agentSignup: (data: { name: string; phone: string; email: string; pin: string; teamMode: string }) =>
    api.post('/auth/agent/signup', data),
  
  // Agent Login with PIN
  agentLogin: (data: { phone: string; pin: string }) =>
    api.post('/auth/agent/login', data),
  
  // Forgot PIN - Send OTP
  forgotPinSendOTP: (phone: string) =>
    api.post('/auth/agent/forgot-pin', { phone }),
  
  // Forgot PIN - Reset PIN with OTP
  forgotPinResetPin: (data: { phone: string; otp: string; newPin: string }) =>
    api.post('/auth/agent/reset-pin', data),
  
  // Agent OTP Auth (kept for backward compatibility)
  sendAgentOTP: (phone: string) =>
    api.post('/auth/agent/send-otp', { phone }),
  
  verifyAgentOTP: (phone: string, code: string, name?: string, teamMode?: string) =>
    api.post('/auth/agent/verify-otp', { phone, code, name, teamMode }),
  
  // Client OTP Auth
  sendClientOTP: (phone: string) =>
    api.post('/auth/client/send-otp', { phone }),
  
  verifyClientOTP: (phone: string, code: string) =>
    api.post('/auth/client/verify-otp', { phone, code }),
  
  // Admin Auth
  adminLogin: (data: { email: string; password: string }) =>
    api.post('/auth/admin/login', data),
  
  // Get current user
  getMe: () =>
    api.get('/auth/me'),
};

// ==========================================
// AGENT APIs
// ==========================================
export const agentAPI = {
  getDashboard: () =>
    api.get('/agent/dashboard'),
  
  getProfile: () =>
    api.get('/agent/profile'),
  
  updateProfile: (data: any) =>
    api.put('/agent/profile', data),
  
  getMonthlyReport: (month?: number, year?: number) =>
    api.get('/agent/monthly-report', { params: { month, year } }),
  
  // Sub-agents
  getSubAgents: () =>
    api.get('/agent/sub-agents'),
  
  createSubAgent: (data: any) =>
    api.post('/agent/sub-agents', data),
  
  updateSubAgent: (id: string, data: any) =>
    api.put(`/agent/sub-agents/${id}`, data),
  
  deleteSubAgent: (id: string) =>
    api.delete(`/agent/sub-agents/${id}`),

  uploadSubAgentKyc: (id: string, formData: FormData) =>
    api.post(`/agent/sub-agents/${id}/kyc`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// ==========================================
// CLIENT APIs
// ==========================================
export const clientAPI = {
  getAll: (params?: any) =>
    api.get('/clients', { params }),
  
  getById: (id: string) =>
    api.get(`/clients/${id}`),
  
  create: (data: any) =>
    api.post('/clients', data),
  
  update: (id: string, data: any) =>
    api.put(`/clients/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/clients/${id}`),
  
  // Family members
  addFamilyMember: (clientId: string, data: any) =>
    api.post(`/clients/${clientId}/family`, data),
  
  updateFamilyMember: (clientId: string, memberId: string, data: any) =>
    api.put(`/clients/${clientId}/family/${memberId}`, data),
  
  deleteFamilyMember: (clientId: string, memberId: string) =>
    api.delete(`/clients/${clientId}/family/${memberId}`),
  
  // Client ledger/khata
  getLedger: (clientId: string) =>
    api.get(`/clients/${clientId}/ledger`),
};

// ==========================================
// POLICY APIs
// ==========================================
export const policyAPI = {
  getAll: (params?: any) =>
    api.get('/policies', { params }),
  
  getById: (id: string) =>
    api.get(`/policies/${id}`),
  
  create: (data: any, files?: { [key: string]: File }) => {
    if (files && Object.keys(files).length > 0) {
      const formData = new FormData();
      
      // Add text data
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      
      // Add files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });
      
      return api.post('/policies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      return api.post('/policies', data);
    }
  },
  
  update: (id: string, data: any) =>
    api.put(`/policies/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/policies/${id}`),
  
  renew: (id: string, data: any) =>
    api.post(`/policies/${id}/renew`, data),
  
  // Get insurance companies for dropdown
  getCompanies: () =>
    api.get('/policies/companies'),
  
  // Create insurance company
  createCompany: (data: { name: string; code?: string }) =>
    api.post('/policies/companies', data),
  
  // Scan document for OCR extraction
  scanDocument: (formData: FormData) =>
    api.post('/policies/scan-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Parse Excel file for bulk import
  parseExcel: (formData: FormData) =>
    api.post('/policies/parse-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Bulk create policies from Excel
  bulkCreate: (policies: any[]) =>
    api.post('/policies/bulk', { policies }),
  
  // Search clients by name, policy number, or vehicle number
  searchClients: (query: string) =>
    api.get('/policies/search-clients', { params: { query } }),
};

// ==========================================
// LEDGER APIs (Smart Khata)
// ==========================================
export const ledgerAPI = {
  getAll: (params?: any) =>
    api.get('/ledger', { params }),
  
  createDebit: (data: any) =>
    api.post('/ledger/debit', data),
  
  createCollection: (data: any) =>
    api.post('/ledger/collection', data),
  
  getClientKhata: (clientId: string) =>
    api.get(`/ledger/client/${clientId}/khata`),
  
  getPending: () =>
    api.get('/ledger/pending'),
  
  update: (id: string, data: any) =>
    api.put(`/ledger/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/ledger/${id}`),
  
  // Sub-Agent Ledger
  getSubAgentLedger: (subAgentId: string) =>
    api.get(`/ledger/sub-agent/${subAgentId}`),
  
  createSubAgentPayout: (data: { subAgentId: string; amount: number; description: string; entryDate: string }) =>
    api.post('/ledger/sub-agent/payout', data),
};

// ==========================================
// COMMISSION APIs
// ==========================================
export const commissionAPI = {
  getAll: (params?: any) =>
    api.get('/commissions', { params }),
  
  getByCompany: (companyId: string, params?: any) =>
    api.get(`/commissions/company/${companyId}`, { params }),
  
  markPaid: (id: string, receivedDate?: string) =>
    api.put(`/commissions/${id}/mark-paid`, { receivedDate }),
  
  bulkMarkPaid: (commissionIds: string[], receivedDate?: string) =>
    api.put('/commissions/bulk-mark-paid', { commissionIds, receivedDate }),
  
  getSubAgentCommissions: (subAgentId: string) =>
    api.get(`/commissions/sub-agent/${subAgentId}`),
};

// ==========================================
// RENEWAL APIs
// ==========================================
export const renewalAPI = {
  getUpcoming: (days?: number) =>
    api.get('/renewals/upcoming', { params: { days } }),
  
  getExpired: () =>
    api.get('/renewals/expired'),
  
  getCalendar: (month?: number, year?: number) =>
    api.get('/renewals/calendar', { params: { month, year } }),
  
  getToday: () =>
    api.get('/renewals/today'),
  
  markRenewed: (id: string, newPolicyId?: string) =>
    api.put(`/renewals/${id}/mark-renewed`, { newPolicyId }),
  
  sendReminder: (id: string) =>
    api.post(`/renewals/${id}/send-reminder`),
};

// ==========================================
// BROKER APIs (PolicyBazaar, MitPro, Probus, etc.)
// ==========================================
export const brokerAPI = {
  getAll: (params?: any) =>
    api.get('/brokers', { params }),
  
  getById: (id: string) =>
    api.get(`/brokers/${id}`),
  
  create: (data: { name: string; code?: string; contactPerson?: string; email?: string; phone?: string; address?: string }) =>
    api.post('/brokers', data),
  
  update: (id: string, data: any) =>
    api.put(`/brokers/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/brokers/${id}`),
};

export default api;
