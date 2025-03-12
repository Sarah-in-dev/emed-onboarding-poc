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

// Helper to check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('token')?.startsWith('demo-token') || false;
};

// Helper to generate mock data for demo mode
const generateMockData = (type) => {
  const companyData = JSON.parse(localStorage.getItem('company') || '{}');
  const companyName = companyData?.name || 'Demo Company';
  
  switch (type) {
    case 'metrics':
      const companySize = companyData?.size ? 
        parseInt(companyData.size.split('-')[0]) || 200 : 200;
      const enrollmentRate = Math.floor(Math.random() * 30) + 65; // 65-95%
      const enrolledCount = Math.floor(companySize * (enrollmentRate / 100));
      const activeRate = Math.floor(Math.random() * 20) + 75; // 75-95%
      const activeCount = Math.floor(enrolledCount * (activeRate / 100));
      
      return {
        total_enrolled: enrolledCount,
        total_employees: companySize,
        active_users: activeCount,
        total_prescriptions: Math.floor(activeCount * 0.8)
      };
      
    case 'employees':
      const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const firstNames = ['John', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'James', 'Ava', 'Benjamin', 'Isabella'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
      
      const mockEmployees = Array.from({ length: 20 }, (_, i) => {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyDomain}`;
        
        // Generate a date within the last 3 months
        const enrollmentDate = new Date();
        enrollmentDate.setDate(enrollmentDate.getDate() - Math.floor(Math.random() * 90));
        
        return {
          user_id: i + 1,
          name: fullName,
          email: email,
          enrollment_date: enrollmentDate.toISOString(),
          status: Math.random() > 0.1 ? 'active' : 'inactive', // 90% active
          emed_identifier: `EMED-${companyName.substring(0, 3).toUpperCase()}-${(1000 + i).toString()}`
        };
      });
      
      // Sort by most recent enrollment
      return mockEmployees.sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date));
      
    case 'codeBatches':
      return Array.from({ length: 3 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i * 15); // Each batch 15 days apart
        
        const quantity = 50 * (i + 1);
        const active = Math.floor(quantity * (0.8 - (i * 0.2)));
        const used = Math.floor(quantity * (0.15 + (i * 0.15)));
        const expired = quantity - active - used;
        
        return {
          batch_id: i + 1,
          notes: i === 0 ? 'Q2 2025 Enrollment' : i === 1 ? 'Q1 2025 Enrollment' : 'Initial Enrollment',
          quantity: quantity,
          active_count: active,
          used_count: used,
          expired_count: expired,
          created_at: date.toISOString()
        };
      });
      
    case 'codes':
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
      const codeLength = 8;
      
      return Array.from({ length: 50 }, (_, i) => {
        let code = '';
        for (let j = 0; j < codeLength; j++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // First 35 are active, next 10 are used, last 5 are expired
        let status = 'active';
        if (i >= 35 && i < 45) status = 'used';
        else if (i >= 45) status = 'expired';
        
        return {
          code_id: i + 1,
          code: `EMED-${code}`,
          status: status,
          created_at: new Date().toISOString()
        };
      });
      
    default:
      return [];
  }
};

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
  getMetrics: () => {
    if (isDemoMode()) {
      return Promise.resolve({ data: generateMockData('metrics') });
    }
    return api.get('/metrics');
  },
  
  // Enrollment Codes
  generateCodes: (quantity, notes) => {
    if (isDemoMode()) {
      const mockBatch = {
        batch_id: Math.floor(Math.random() * 1000),
        quantity,
        notes,
        created_at: new Date().toISOString(),
        codes: Array.from({ length: quantity }, (_, i) => {
          const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = 'EMED-';
          for (let j = 0; j < 8; j++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
          }
          return { code, status: 'active' };
        })
      };
      return Promise.resolve({ data: mockBatch });
    }
    return api.post('/codes/generate', { quantity, notes });
  },
  
  getCodes: (batchId, status) => {
    if (isDemoMode()) {
      return Promise.resolve({ data: generateMockData('codes') });
    }
    return api.get('/codes', { params: { batch_id: batchId, status } });
  },
  
  getCodeBatches: () => {
    if (isDemoMode()) {
      return Promise.resolve({ data: generateMockData('codeBatches') });
    }
    return api.get('/code-batches');
  },
  
  // Employees
  getEmployees: (status, search) => {
    if (isDemoMode()) {
      let employees = generateMockData('employees');
      
      // Filter by status if provided
      if (status === 'active') {
        employees = employees.filter(emp => emp.status === 'active');
      } else if (status === 'inactive') {
        employees = employees.filter(emp => emp.status === 'inactive');
      }
      
      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        employees = employees.filter(emp => 
          emp.name.toLowerCase().includes(searchLower) ||
          emp.email.toLowerCase().includes(searchLower)
        );
      }
      
      return Promise.resolve({ data: employees });
    }
    return api.get('/employees', { params: { status, search } });
  },
  
  deactivateEmployee: (userId) => {
    if (isDemoMode()) {
      return Promise.resolve({ data: { success: true, userId } });
    }
    return api.put(`/employees/${userId}/deactivate`);
  },
  
  // Provisioning 
  provisionCompany: (data) => {
    if (isDemoMode()) {
      const portalName = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return Promise.resolve({
        data: {
          company: {
            id: Math.floor(Math.random() * 1000),
            name: data.companyName
          },
          admin: {
            id: Math.floor(Math.random() * 1000),
            email: data.adminUser.email
          },
          credentials: {
            email: data.adminUser.email,
            tempPassword: 'Demo' + Math.random().toString(36).substring(2, 8).toUpperCase()
          },
          portalUrl: `https://emed-care.com/portal/${portalName}`
        }
      });
    }
    
    console.log('Provision company called with data:', data);
    // Use the proxy endpoint
    return axios.post('/api/proxy', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },  

  // Enrollment
  validateCode: (code) => {
    if (isDemoMode()) {
      const companyData = JSON.parse(localStorage.getItem('company') || '{}');
      
      return Promise.resolve({
        data: {
          valid: true,
          code: code,
          program: {
            name: 'GLP-1 Medication Program',
            description: 'Chronic care management program for GLP-1 medications'
          },
          company: companyData
        }
      });
    }
    return api.post('/codes/validate', { code });
  },
  
  enrollUser: (data) => {
    if (isDemoMode()) {
      const companyData = JSON.parse(localStorage.getItem('company') || '{}');
      const identifier = `EMED-${companyData.name?.substring(0, 3).toUpperCase() || 'DEM'}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      return Promise.resolve({
        data: {
          user_id: Math.floor(Math.random() * 1000),
          name: data.name,
          email: data.email,
          emed_identifier: identifier,
          enrollment_date: new Date().toISOString(),
          status: 'active'
        }
      });
    }
    return api.post('/enroll', data);
  }
};
