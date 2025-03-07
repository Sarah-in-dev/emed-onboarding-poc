import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for stored auth token on load
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');
    
    if (token && storedUser && storedCompany) {
      setUser(JSON.parse(storedUser));
      setCompany(JSON.parse(storedCompany));
      api.setAuthToken(token);
    }
    
    setLoading(false);
  }, []);
  
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, admin, company } = response.data;
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(admin));
      localStorage.setItem('company', JSON.stringify(company));
      
      // Set context state
      setUser(admin);
      setCompany(company);
      api.setAuthToken(token);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };
  
  const logout = () => {
    // Clear stored auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    
    // Reset context state
    setUser(null);
    setCompany(null);
    api.setAuthToken(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, company, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
