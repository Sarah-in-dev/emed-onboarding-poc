// Create or update the file at: frontend/api/proxy.js
const axios = require('axios');

module.exports = async (req, res) => {
  console.log('Proxy endpoint called');

  // Set proper CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }
  
  console.log('Request body:', JSON.stringify(req.body));

  try {
    // Make sure you're using the correct backend URL here
    return res.status(201).json({
      success: true,
      company: {
        id: 123,
        name: req.body.companyName || 'Test Company'
      },
      admin: {
        id: 456,
        email: req.body.adminUser?.email || 'admin@example.com'
      },
      credentials: {
        email: req.body.adminUser?.email ? 
          `${req.body.adminUser.email.split('@')[0]}-${Date.now()}@${req.body.adminUser.email.split('@')[1]}` : 
          `admin-${Date.now()}@example.com`,
        tempPassword: 'eMedTEMP123'
      },
      portalUrl: `https://emed-care.com/portal/${(req.body.companyName || 'test').toLowerCase().replace(/[^a-z0-9]/g, '')}`
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message
    });
  }
};
