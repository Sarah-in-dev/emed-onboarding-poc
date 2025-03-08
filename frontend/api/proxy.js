const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const response = await axios.post(
      'https://emed-onboarding-poc.vercel.app/api/companies/provision',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      stack: error.stack
    });
  }
};
