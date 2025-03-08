const postgres = require('postgres');
const bcrypt = require('bcrypt');

// Configure PostgreSQL connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
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
      
      console.log('Processing company provision request:', companyName);
      
      // Use a transaction with the postgres library
      const result = await sql.begin(async sql => {
        // Create company
        const companyResult = await sql`
          INSERT INTO companies (name, address, industry, size) 
          VALUES (${companyName}, ${address}, ${industry}, ${size}) 
          RETURNING *
        `;
        
        const company = companyResult[0];
        
        // Generate temporary password
        const tempPassword = `eMed${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        // Create admin user
        const adminResult = await sql`
          INSERT INTO company_admins (company_id, name, email, title, password_hash) 
          VALUES (${company.company_id}, ${adminUser.name}, ${adminUser.email}, ${adminUser.title}, ${passwordHash}) 
          RETURNING *
        `;
        
        const admin = adminResult[0];
        
        // Get default program (GLP-1)
        const programResult = await sql`
          SELECT * FROM programs WHERE code = ${'GLP1'}
        `;
        
        const program = programResult[0];
        
        // Generate portal URL based on company name
        const portalName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const portalUrl = `https://emed-care.com/portal/${portalName}`;
        
        return {
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
        };
      });
      
      return res.status(201).json(result);
      
    } catch (error) {
      console.error('Provisioning error:', error);
      return res.status(500).json({ 
        error: 'Failed to provision company portal',
        message: error.message
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};
