// Create or update the file at: frontend/api/proxy.js
const axios = require('axios');

module.exports = async (req, res) => {
  // Set proper CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Make sure you're using the correct backend URL here
    const backendUrl = 'https://emed-onboarding-poc.vercel.app'; // Update this to your actual backend URL
    
    console.log('Proxying request to:', `${backendUrl}/api/companies/provision`);
    console.log('Request body:', JSON.stringify(req.body));
    
    const response = await axios.post(
      `${backendUrl}/api/companies/provision`,
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
    console.error(error.response?.data || 'No response data');
    
    return res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
};
