import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DemoPortalPage = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [loginCredentials, setLoginCredentials] = useState({
    email: '',
    password: ''
  });

  // Demo portal options
  const demoPortals = [
    {
      id: 'acme',
      name: 'ACME Corporation',
      employeeCount: 350,
      industry: 'Technology',
      enrollmentRate: 78,
      logo: '🏢',
      color: 'indigo'
    },
    {
      id: 'healthco',
      name: 'HealthCo Medical Group',
      employeeCount: 520,
      industry: 'Healthcare',
      enrollmentRate: 92,
      logo: '🏥',
      color: 'emerald'
    },
    {
      id: 'globalretail',
      name: 'Global Retail Inc.',
      employeeCount: 1200,
      industry: 'Retail',
      enrollmentRate: 65,
      logo: '🛒',
      color: 'amber'
    }
  ];

  useEffect(() => {
    // If portalId is provided, auto-select that demo
    if (portalId) {
      const matchedPortal = demoPortals.find(portal => portal.id === portalId);
      if (matchedPortal) {
        setSelectedDemo(matchedPortal);
        setLoginCredentials({
          email: `admin@${matchedPortal.id}.com`,
          password: 'demo123'
        });
      }
    }
    
    setLoading(false);
  }, [portalId]);

  const handleDemoSelect = (demo) => {
    setSelectedDemo(demo);
    setLoginCredentials({
      email: `admin@${demo.id}.com`,
      password: 'demo123'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate login without actually calling the backend
    setTimeout(async () => {
      // Create mock data for the demo company
      const mockData = {
        token: 'demo-token-' + Math.random().toString(36).substring(2),
        admin: {
          id: 1,
          name: `Admin User (${selectedDemo.name})`,
          email: loginCredentials.email,
          title: 'HR Manager'
        },
        company: {
          id: demoPortals.indexOf(selectedDemo) + 1,
          name: selectedDemo.name,
          industry: selectedDemo.industry,
          size: `${selectedDemo.employeeCount} employees`
        }
      };
      
      // Store mock data in localStorage to simulate authentication
      localStorage.setItem('token', mockData.token);
      localStorage.setItem('user', JSON.stringify(mockData.admin));
      localStorage.setItem('company', JSON.stringify(mockData.company));
      
      try {
        // Try to use the auth context login
        if (login) {
          await login(loginCredentials.email, loginCredentials.password);
        }
        
        // Navigate to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Error logging in:', err);
        setLoading(false);
      }
    }, 1000);
  };

  const getColorClasses = (color) => {
    const colorMap = {
      'indigo': {
        bg: 'bg-indigo-600',
        bgLight: 'bg-indigo-100',
        text: 'text-indigo-600',
        hover: 'hover:bg-indigo-700',
        ring: 'focus:ring-indigo-500',
        border: 'border-indigo-300',
        borderAccent: 'border-indigo-500'
      },
      'emerald': {
        bg: 'bg-emerald-600',
        bgLight: 'bg-emerald-100',
        text: 'text-emerald-600',
        hover: 'hover:bg-emerald-700',
        ring: 'focus:ring-emerald-500',
        border: 'border-emerald-300',
        borderAccent: 'border-emerald-500'
      },
      'amber': {
        bg: 'bg-amber-600',
        bgLight: 'bg-amber-100',
        text: 'text-amber-600',
        hover: 'hover:bg-amber-700',
        ring: 'focus:ring-amber-500',
        border: 'border-amber-300',
        borderAccent: 'border-amber-500'
      }
    };
    
    return colorMap[color] || colorMap['indigo'];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">eMed Demo Portals</h1>
          <p className="mt-2 text-sm text-gray-600">
            Select a demo company to explore the GLP-1 Medication Program portal
          </p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {!selectedDemo ? (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Available Demo Portals</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {demoPortals.map(demo => {
                  const colors = getColorClasses(demo.color);
                  return (
                    <div 
                      key={demo.id}
                      onClick={() => handleDemoSelect(demo)}
                      className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow duration-200"
                    >
                      <div className={`w-12 h-12 rounded-lg ${colors.bgLight} flex items-center justify-center text-2xl mb-3`}>
                        {demo.logo}
                      </div>
                      <h3 className="font-medium text-gray-900">{demo.name}</h3>
                      <p className="text-sm text-gray-500">{demo.industry}</p>
                      <p className="text-sm text-gray-500">{demo.employeeCount} employees</p>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Enrollment Rate</span>
                          <span className="text-xs font-medium">{demo.enrollmentRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={colors.bg}
                            style={{ width: `${demo.enrollmentRate}%`, height: '100%', borderRadius: '9999px' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              <div className={`${getColorClasses(selectedDemo.color).bg} text-white p-6 md:w-1/3`}>
                <div className="mb-6">
                  <button 
                    onClick={() => setSelectedDemo(null)}
                    className="text-white hover:underline flex items-center"
                  >
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to portal selection
                  </button>
                </div>
                
                <div className="text-6xl mb-4">{selectedDemo.logo}</div>
                <h2 className="text-2xl font-bold mb-1">{selectedDemo.name}</h2>
                <p className="opacity-75 mb-4">{selectedDemo.industry}</p>
                
                <div className="border-t border-white border-opacity-20 pt-4 mt-4">
                  <h3 className="text-sm uppercase tracking-wider opacity-75 mb-2">Demo Portal Info</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className="opacity-75">Employees:</span>
                      <span>{selectedDemo.employeeCount}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="opacity-75">Enrollment Rate:</span>
                      <span>{selectedDemo.enrollmentRate}%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="opacity-75">Active Participants:</span>
                      <span>{Math.round(selectedDemo.employeeCount * (selectedDemo.enrollmentRate / 100) * 0.85)}</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="p-6 md:w-2/3">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Log in to {selectedDemo.name} Portal</h2>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={loginCredentials.email}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={loginCredentials.password}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${getColorClasses(selectedDemo.color).bg} ${getColorClasses(selectedDemo.color).hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${getColorClasses(selectedDemo.color).ring}`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing in...</span>
                        </div>
                      ) : 'Sign in to Demo'}
                    </button>
                  </div>
                  
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500">
                      This is a demonstration portal. No actual data will be saved.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoPortalPage;
