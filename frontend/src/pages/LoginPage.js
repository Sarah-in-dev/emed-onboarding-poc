import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log('Attempting login with email:', email);
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('Login returned unsuccessful');
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`An error occurred. Please try again. Details: ${err.message || 'Unknown error'}`);
    }
    
    setLoading(false);
  };
  
  const testApiConnection = async () => {
    try {
      setApiTestResult({ status: 'testing', message: 'Testing API connection...' });
      
      // Get the API URL from environment or default
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log('Testing API connection to:', apiUrl);
      
      // Test a simple endpoint
      const response = await fetch(`${apiUrl}/test`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Test Response:', data);
      
      setApiTestResult({
        status: 'success',
        message: `API connection successful! Server time: ${data.timestamp}`,
        data
      });
    } catch (error) {
      console.error('API Test Error:', error);
      setApiTestResult({
        status: 'error',
        message: `API connection failed: ${error.message}`
      });
    }
  };
  
  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get the API URL from environment or default
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log('Seeding database using API at:', apiUrl);
      
      const response = await fetch(`${apiUrl}/seed`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Database seeded successfully!\nLogin with:\nEmail: ${data.credentials.email}\nPassword: ${data.credentials.password}`);
        setEmail(data.credentials.email);
        setPassword(data.credentials.password);
      } else {
        alert('Failed to seed database: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Seeding error:', error);
      alert(`An error occurred while seeding the database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            eMed Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your company admin account
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {apiTestResult && (
          <div className={`border px-4 py-3 rounded relative ${
            apiTestResult.status === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 
            apiTestResult.status === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 
            'bg-blue-100 border-blue-400 text-blue-700'
          }`}>
            <span className="block sm:inline">{apiTestResult.message}</span>
            {apiTestResult.data && (
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(apiTestResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="flex justify-between">
            <a href="/provision"
              className="font-medium text-indigo-600 hover:text-indigo-500">
              New company? Sign up here
            </a>
            
            <button
              type="button"
              onClick={testApiConnection}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Test API Connection
            </button>
          </div>
          
          <div className="text-center pt-4 border-t">
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={loading}
              className="font-medium text-gray-600 hover:text-gray-500"
            >
              Seed Database (Demo)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
