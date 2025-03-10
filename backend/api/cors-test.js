module.exports = (req, res) => {
  // Set explicit CORS headers for all methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle OPTIONS method for preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // For other methods, return a simple response
  return res.json({
    message: 'CORS test successful',
    timestamp: new Date().toISOString()
  });
};
