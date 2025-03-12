import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const CodesPage = () => {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulated loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Enrollment Codes</h1>
        
        {loading ? (
          <div className="text-center py-10">
            <p>Loading codes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Generate Codes</h2>
              <p className="text-gray-600 mb-4">Create new enrollment codes for your employees.</p>
              <button className="bg-indigo-600 text-white py-2 px-4 rounded">
                Generate Codes
              </button>
            </div>
            
            <div className="bg-white rounded shadow p-4 md:col-span-2">
              <h2 className="text-lg font-semibold mb-2">Demo Codes</h2>
              <p className="text-gray-600">EMED-12345678</p>
              <p className="text-gray-600">EMED-87654321</p>
              <p className="text-gray-600">EMED-11223344</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CodesPage;
