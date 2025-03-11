import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }
    
    setLoading(false);
  };
  
  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/seed`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Database seeded successfully!\nLogin with:\nEmail: ${data.credentials.email}\nPassword: ${data.credentials.password}`);
        setEmail(data.credentials.email);
        setPassword(data.credentials.password);
      } else {
        alert('Failed to seed database');
      }
      setLoading(false);
    } catch (error) {
      console.error('Seeding error:', error);
      alert('An error occurred while seeding the database');
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
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center">
            <a href="/provision"
              className="font-medium text-indigo-600 hover:text-indigo-500">
              New company? Sign up here
            </a>
          </div>
          
          {/* Demo Portal Options */}
          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Want to see how it works?</p>
            <a
              href="/portal"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Try Demo Portal
            </a>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              <a 
                href="/portal/acme" 
                className="px-2 py-1 text-xs border border-indigo-200 rounded hover:bg-indigo-50 text-indigo-600"
              >
                Tech Demo
              </a>
              <a 
                href="/portal/healthco" 
                className="px-2 py-1 text-xs border border-emerald-200 rounded hover:bg-emerald-50 text-emerald-600"
              >
                Healthcare Demo
              </a>
              <a 
                href="/portal/globalretail" 
                className="px-2 py-1 text-xs border border-amber-200 rounded hover:bg-amber-50 text-amber-600"
              >
                Retail Demo
              </a>
            </div>
          </div>
          
          {/* Database Seed Option for Development */}
          <div className="text-center pt-4 border-t">
            <button
              type="button"
              onClick={handleSeedDatabase}
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
