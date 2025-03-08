const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
  // Set CORS headers directly
  res.setHeader('Access-Control-Allow-Origin', 'https://emed-onboarding-poc.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    const client = await pool.connect();
    
    try {
      const { 
        companyName, 
        address, 
        industry, 
        size,
        primaryContact,
        adminUser,
        planDetails
      } = req.body;
      
      await client.query('BEGIN');
      
      // Create company
      const companyResult = await client.query(
        'INSERT INTO companies (name, address, industry, size) VALUES ($1, $2, $3, $4) RETURNING *',
        [companyName, address, industry, size]
      );
      
      const company = companyResult.rows[0];
      
      // Generate temporary password
      const tempPassword = `eMed${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      // Create admin user
      const adminResult = await client.query(
        'INSERT INTO company_admins (company_id, name, email, title, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [company.company_id, adminUser.name, adminUser.email, adminUser.title, passwordHash]
      );
      
      const admin = adminResult.rows[0];
      
      // Get default program (GLP-1)
      const programResult = await client.query(
        'SELECT * FROM programs WHERE code = $1',
        ['GLP1']
      );
      
      const program = programResult.rows[0];
      
      await client.query('COMMIT');
      
      // Generate portal URL based on company name
      const portalName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const portalUrl = `https://emed-care.com/portal/${portalName}`;
      
      return res.status(201).json({
        company: {
          id: company.company_id,
          name: company.name
        },
        admin: {
          id: admin.admin_id,
          email: admin.email
        },
        credentials: {
          email: admin.email,
          tempPassword: tempPassword
        },
        portalUrl: portalUrl
      });
      
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
