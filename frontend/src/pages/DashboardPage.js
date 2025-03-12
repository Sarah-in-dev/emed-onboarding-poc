import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { company } = useAuth();
  const [metrics, setMetrics] = useState({
    total_enrolled: 0,
    total_employees: 0,
    active_users: 0,
    total_prescriptions: 0
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if we're in demo mode based on token
  const isDemoMode = localStorage.getItem('token')?.startsWith('demo-token') || false;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If demo mode, use mock data
        if (isDemoMode) {
          // Mock metrics based on company info if available
          const companySize = company?.size ? parseInt(company.size.split('-')[0]) || 200 : 200;
          const enrollmentRate = Math.floor(Math.random() * 30) + 65; // 65-95%
          const enrolledCount = Math.floor(companySize * (enrollmentRate / 100));
          const activeRate = Math.floor(Math.random() * 20) + 75; // 75-95%
          const activeCount = Math.floor(enrolledCount * (activeRate / 100));
          
          const mockMetrics = {
            total_enrolled: enrolledCount,
            total_employees: companySize,
            active_users: activeCount,
            total_prescriptions: Math.floor(activeCount * 0.8)
          };
          setMetrics(mockMetrics);
          
          // Create mock employees with company specific data
          const companyName = company?.name || 'Demo Company';
          const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
          
          const firstNames = ['John', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'James', 'Ava', 'Benjamin', 'Isabella'];
          const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
          
          const mockEmployees = [];
          
          // Generate 5 random employees
          for (let i = 0; i < 5; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const fullName = `${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyDomain}`;
            
            // Generate a date within the last 3 months
            const enrollmentDate = new Date();
            enrollmentDate.setDate(enrollmentDate.getDate() - Math.floor(Math.random() * 90));
            
            mockEmployees.push({
              user_id: i + 1,
              name: fullName,
              email: email,
              enrollment_date: enrollmentDate.toISOString(),
              status: Math.random() > 0.1 ? 'active' : 'inactive', // 90% active
              emed_identifier: `EMED-${companyName.substring(0, 3).toUpperCase()}-${(1000 + i).toString()}`
            });
          }
          
          // Sort by most recent enrollment
          mockEmployees.sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date));
          
          setEmployees(mockEmployees);
          setLoading(false);
          return;
        }
        
        // Normal API fetch for real data mode
        try {
          // Fetch metrics
          const metricsResponse = await api.getMetrics();
          setMetrics(metricsResponse.data);
          
          // Fetch recent employees
          const employeesResponse = await api.getEmployees('active');
          setEmployees(employeesResponse.data.slice(0, 5)); // Show only 5 most recent
        } catch (apiError) {
          console.error('API fetch error:', apiError);
          
          // Fallback to mock data if API fails
          setMetrics({
            total_enrolled: 0,
            total_employees: 0,
            active_users: 0,
            total_prescriptions: 0
          });
          
          setEmployees([]);
          
          // Only set error if we're not in demo mode
          if (!isDemoMode) {
            setError('Failed to load dashboard data. Please try again later.');
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [company, isDemoMode]);
  
  if (loading) {
    return (
      <Layout>
        <div className="text-center py-10">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-gray-600">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {company?.name || 'Demo Company'}</h1>
        <p className="text-gray-600">GLP-1 Medication Program Dashboard</p>
        
        {isDemoMode && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            You are currently viewing a demo dashboard with simulated data.
          </div>
        )}
      </div>
      
      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-indigo-100 rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Enrollment Rate</p>
              <div className="flex items-end">
                <h2 className="text-3xl font-bold text-gray-900">{metrics?.total_enrolled || 0}</h2>
                <p className="text-sm text-gray-500 ml-2 mb-1">/ {metrics?.total_employees || 0}</p>
              </div>
              <p className="text-sm text-gray-500">
                {metrics?.total_employees ? Math.round((metrics.total_enrolled / metrics.total_employees) * 100) : 0}% of workforce
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Participants</p>
              <div className="flex items-end">
                <h2 className="text-3xl font-bold text-gray-900">{metrics?.active_users || 0}</h2>
                <p className="text-sm text-gray-500 ml-2 mb-1">/ {metrics?.total_enrolled || 0}</p>
              </div>
              <p className="text-sm text-gray-500">
                {metrics?.total_enrolled ? Math.round((metrics.active_users / metrics.total_enrolled) * 100) : 0}% of enrolled
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Prescriptions</p>
              <h2 className="text-3xl font-bold text-gray-900">{metrics?.total_prescriptions || 0}</h2>
              <p className="text-sm text-gray-500">Total prescriptions</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent enrollments and quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Enrollments</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {employees && employees.length > 0 ? (
              employees.map((employee) => (
                <div key={employee.user_id} className="px-6 py-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(employee.enrollment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-gray-500">
                No enrollments yet
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50">
            <Link
              to="/employees"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all enrollments →
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <Link
              to="/codes"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate Enrollment Codes
            </Link>
            
            <Link
              to="/employees"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Manage Enrolled Employees
            </Link>
          </div>
        </div>
      </div>
      
      {isDemoMode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Demo Information</h3>
          <p className="text-sm text-gray-600 mb-3">
            This is a demonstration of the eMed GLP-1 Medication Program dashboard. The data shown is simulated.
          </p>
          <p className="text-sm text-gray-600">
            In a real implementation, this dashboard would show actual enrollment data, active participants, 
            and prescription information for your company's GLP-1 medication program.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Feel free to explore:</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>View and manage enrolled employees</li>
              <li>Generate new enrollment codes</li>
              <li>Monitor program metrics and effectiveness</li>
            </ul>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DashboardPage;
