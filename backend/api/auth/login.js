const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const postgres = require('postgres');

// Initialize DB connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only process POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    // Find admin by email
    const adminResult = await sql`
      SELECT * FROM company_admins 
      WHERE email = ${email} 
      AND active = TRUE
    `;
    
    if (adminResult.length === 0) {
      console.log('Admin not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = adminResult[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get company info
    const companyResult = await sql`
      SELECT * FROM companies 
      WHERE company_id = ${admin.company_id}
    `;
    
    const company = companyResult[0];
    
    // Update last login timestamp
    await sql`
      UPDATE company_admins 
      SET last_login = NOW() 
      WHERE admin_id = ${admin.admin_id}
    `;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        admin_id: admin.admin_id, 
        company_id: admin.company_id,
        email: admin.email,
        name: admin.name
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for:', email);
    return res.json({
      token,
      admin: {
        id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        title: admin.title
      },
      company: {
        id: company.company_id,
        name: company.name,
        industry: company.industry,
        size: company.size
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};
