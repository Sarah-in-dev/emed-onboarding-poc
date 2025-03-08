// backend/api/companies/provision.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  const allowedOrigins = [
    'http://localhost:3000',
    'https://emed-onboarding-poc-frontend.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    const client = await pool.connect();
    
    try {
      // Rest of your provisioning code remains the same
      // ...
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Provisioning error:', error);
      return res.status(500).json({ error: 'Failed to provision company portal' });
    } finally {
      client.release();
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
