import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const EmployeesPage = () => {
  // Check if in demo mode
  const isDemoMode = localStorage.getItem('token')?.startsWith('demo-token') || false;
  
  const [employees, setEmployees] = useState([]);  // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  useEffect(() => {
    // Simulate API call to not trigger real backend
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (isDemoMode) {
          // Generate mock employees data
          setTimeout(() => {
            const mockEmployees = Array.from({ length: 5 }, (_, i) => ({
              user_id: i + 1,
              name: `Demo Employee ${i + 1}`,
              email: `employee${i + 1}@example.com`,
              enrollment_date: new Date().toISOString(),
              status: i < 4 ? 'active' : 'inactive',
              emed_identifier: `EMED-${1000 + i}`
            }));
            
            setEmployees(mockEmployees);
            setLoading(false);
          }, 1000);
        } else {
          // Regular API code here (commented out to prevent errors)
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        setError("Failed to load employees");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isDemoMode, showInactive]);
  
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Employees Page</h1>
        
        {loading ? (
          <div className="text-center py-10">
            <p>Loading employees...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.length > 0 ? (
                  employees.map(employee => (
                    <tr key={employee.user_id}>
                      <td className="px-6 py-4">{employee.name}</td>
                      <td className="px-6 py-4">{employee.email}</td>
                      <td className="px-6 py-4">{employee.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center">No employees found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeesPage;
