const postgres = require('postgres');

module.exports = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Log environment info
    console.log('Testing database connection');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL format:', process.env.DATABASE_URL ? 
                'URL starts with: ' + process.env.DATABASE_URL.substring(0, 20) + '...' : 
                'DATABASE_URL not set');
    
    // Initialize connection
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    const result = await sql`SELECT NOW()`;
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      timestamp: result[0].now,
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to database',
      error: error.message,
      stack: error.stack
    });
  }
};
