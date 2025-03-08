import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear local storage and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default {
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  },
  
  // Auth
  post: (url, data) => api.post(url, data),
  
  // Dashboard
  getMetrics: () => api.get('/metrics'),
  
  // Enrollment Codes
  generateCodes: (quantity, notes) => api.post('/codes/generate', { quantity, notes }),
  getCodes: (batchId, status) => api.get('/codes', { params: { batch_id: batchId, status } }),
  getCodeBatches: () => api.get('/code-batches'),
  
  // Employees
  getEmployees: (status, search) => api.get('/employees', { params: { status, search } }),
  deactivateEmployee: (userId) => api.put(`/employees/${userId}/deactivate`),
  
  // Provisioning 
  provisionCompany: (data) => {
    console.log('Provision company called wiht data:', data);
    //Use the proxy endpoint
    return axios.post('/api/proxy', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },  

  // Enrollment
  validateCode: (code) => api.post('/codes/validate', { code }),
  enrollUser: (data) => api.post('/enroll', data)
};
