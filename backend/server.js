// server.js - Main backend API implementation
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Replace Pool with the postgres package
const sql = require('./db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Use simple CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure body parser middleware
app.use(bodyParser.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Check if company admin
const isCompanyAdmin = async (req, res, next) => {
  try {
    const { admin_id, company_id } = req.user;
    
    const result = await sql`
      SELECT * FROM company_admins 
      WHERE admin_id = ${admin_id} 
      AND company_id = ${company_id} 
      AND active = TRUE
    `;
    
    if (result.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ===== AUTHENTICATION ROUTES =====

//Create a middleware function for handling OPTIONS preflight requests
app.options('/api/auth/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(200).end();
});

// Company admin login
app.post('/api/auth/login', async (req, res) => {
  // Add explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
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
    res.json({
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
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== COMPANY PROVISIONING ROUTES =====

// Create new company and admin portal
app.post('/api/companies/provision', async (req, res) => {
  // Add explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
    
    console.log('Provisioning company:', companyName);
    
    // Make admin email unique by adding timestamp
    const uniqueEmail = adminUser && adminUser.email ? 
      `${adminUser.email.split('@')[0]}-${Date.now()}@${adminUser.email.split('@')[1]}` : 
      `admin-${Date.now()}@example.com`;
    
    console.log('Using unique admin email:', uniqueEmail);
    
    // Start a transaction
    const tx = sql.begin();
    
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
    
    // Create admin user with unique email
    const adminResult = await sql`
      INSERT INTO company_admins (company_id, name, email, title, password_hash) 
      VALUES (${company.company_id}, ${adminUser ? adminUser.name : 'Admin'}, ${uniqueEmail}, ${adminUser ? adminUser.title : 'Admin'}, ${passwordHash}) 
      RETURNING *
    `;
    
    const admin = adminResult[0];
    
    // Ensure GLP1 program exists
    let program;
    try {
      const programCheck = await sql`SELECT * FROM programs WHERE code = 'GLP1'`;
      
      if (programCheck.length === 0) {
        const newProgram = await sql`
          INSERT INTO programs (code, name, description, active)
          VALUES ('GLP1', 'GLP-1 Medication Program', 'Chronic care management program for GLP-1 medications', TRUE)
          RETURNING *
        `;
        program = newProgram[0];
      } else {
        program = programCheck[0];
      }
    } catch (programError) {
      console.log('Program error, attempting to create table:', programError);
      // Try to create programs table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS programs (
          program_id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Try again after creating the table
      const newProgram = await sql`
        INSERT INTO programs (code, name, description, active)
        VALUES ('GLP1', 'GLP-1 Medication Program', 'Chronic care management program for GLP-1 medications', TRUE)
        RETURNING *
      `;
      program = newProgram[0];
    }
    
    // Commit the transaction
    await tx.commit();
    
    // Generate portal URL based on company name
    const portalName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const portalUrl = `https://emed-care.com/portal/${portalName}`;
    
    res.status(201).json({
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
    console.error('Provisioning error:', error);
    res.status(500).json({ 
      error: 'Failed to provision company portal',
      details: error.message,
      stack: error.stack 
    });
  }
});

// ===== SEEDING ROUTE =====

// Seed database with test data
app.post('/api/seed', async (req, res) => {
  // Add explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    console.log('Starting database seed operation');
    
    // Test database connection
    try {
      const testResult = await sql`SELECT NOW()`;
      console.log('Database connection test successful:', testResult[0].now);
    } catch (connError) {
      console.error('Database connection test failed:', connError);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: connError.message 
      });
    }
    
    // Ensure required tables exist
    try {
      // Check/create companies table
      await sql`
        CREATE TABLE IF NOT EXISTS companies (
          company_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          address TEXT,
          industry VARCHAR(50),
          size VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create company_admins table
      await sql`
        CREATE TABLE IF NOT EXISTS company_admins (
          admin_id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(company_id),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          title VARCHAR(100),
          password_hash TEXT NOT NULL,
          active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create programs table
      await sql`
        CREATE TABLE IF NOT EXISTS programs (
          program_id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create code_batches table
      await sql`
        CREATE TABLE IF NOT EXISTS code_batches (
          batch_id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(company_id),
          program_id INTEGER REFERENCES programs(program_id),
          quantity INTEGER NOT NULL,
          notes TEXT,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create enrollment_codes table
      await sql`
        CREATE TABLE IF NOT EXISTS enrollment_codes (
          code_id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          company_id INTEGER REFERENCES companies(company_id),
          program_id INTEGER REFERENCES programs(program_id),
          batch_id INTEGER REFERENCES code_batches(batch_id),
          status VARCHAR(20) DEFAULT 'active',
          created_by INTEGER,
          used_by_user_id INTEGER,
          used_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create enrolled_users table
      await sql`
        CREATE TABLE IF NOT EXISTS enrolled_users (
          user_id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(company_id),
          program_id INTEGER REFERENCES programs(program_id),
          enrollment_code_id INTEGER REFERENCES enrollment_codes(code_id),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          date_of_birth DATE,
          address TEXT,
          emed_identifier VARCHAR(50) UNIQUE,
          status VARCHAR(20) DEFAULT 'active',
          enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create lab_kits table
      await sql`
        CREATE TABLE IF NOT EXISTS lab_kits (
          kit_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES enrolled_users(user_id),
          kit_identifier VARCHAR(50) UNIQUE,
          status VARCHAR(20) DEFAULT 'ordered',
          ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          shipped_at TIMESTAMP,
          delivered_at TIMESTAMP,
          processed_at TIMESTAMP
        )
      `;
      
      // Check/create lab_results table
      await sql`
        CREATE TABLE IF NOT EXISTS lab_results (
          result_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES enrolled_users(user_id),
          kit_id INTEGER REFERENCES lab_kits(kit_id),
          result_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Check/create prescriptions table
      await sql`
        CREATE TABLE IF NOT EXISTS prescriptions (
          prescription_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES enrolled_users(user_id),
          medication VARCHAR(100),
          dosage VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          prescriber VARCHAR(100),
          prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('All required tables created or verified');
    } catch (tableError) {
      console.error('Table creation error:', tableError);
      return res.status(500).json({ 
        error: 'Failed to create required tables', 
        details: tableError.message 
      });
    }
    
    // Create a demo company
    const companyResult = await sql`
      INSERT INTO companies (name, address, industry, size) 
      VALUES ('Demo Company', '123 Main St, Anytown, USA', 'Technology', '51-200')
      RETURNING *
    `;
    
    const company = companyResult[0];
    console.log('Demo company created with ID:', company.company_id);
    
    // Create demo admin
    const adminEmail = `demo-admin-${Date.now()}@example.com`;
    const adminPassword = 'password123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const adminResult = await sql`
      INSERT INTO company_admins (company_id, name, email, title, password_hash)
      VALUES (${company.company_id}, 'Demo Admin', ${adminEmail}, 'HR Manager', ${passwordHash})
      RETURNING *
    `;
    
    const admin = adminResult[0];
    console.log('Demo admin created with ID:', admin.admin_id);
    
    // Ensure GLP1 program exists
    const programResult = await sql`
      INSERT INTO programs (code, name, description, active)
      VALUES ('GLP1', 'GLP-1 Medication Program', 'Chronic care management program for GLP-1 medications', TRUE)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `;
    
    const program = programResult[0];
    
    // Create a demo code batch
    const batchResult = await sql`
      INSERT INTO code_batches (company_id, program_id, quantity, notes)
      VALUES (${company.company_id}, ${program.program_id}, 10, 'Demo batch')
      RETURNING *
    `;
    
    const batch = batchResult[0];
    
    // Generate demo enrollment codes
    for (let i = 0; i < 10; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `DEMO-GLP1-${randomPart}`;
      
      await sql`
        INSERT INTO enrollment_codes (code, company_id, program_id, batch_id)
        VALUES (${code}, ${company.company_id}, ${program.program_id}, ${batch.batch_id})
      `;
    }
    
    // Create a few demo enrolled users
    for (let i = 0; i < 3; i++) {
      // Get a code to use
      const codeResult = await sql`
        SELECT * FROM enrollment_codes 
        WHERE company_id = ${company.company_id} AND status = 'active' 
        LIMIT 1
      `;
      
      if (codeResult.length > 0) {
        const code = codeResult[0];
        
        // Create user
        const userName = `Demo User ${i+1}`;
        const userEmail = `demo-user-${i+1}-${Date.now()}@example.com`;
        const emedId = `EMED-${company.company_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const userResult = await sql`
          INSERT INTO enrolled_users (
            company_id, program_id, enrollment_code_id, name, email, 
            phone, date_of_birth, address, emed_identifier
          )
          VALUES (
            ${company.company_id}, ${program.program_id}, ${code.code_id}, 
            ${userName}, ${userEmail}, '555-123-4567', 
            ${new Date(1980, 0, 1)}, '456 User St, Anytown, USA', ${emedId}
          )
          RETURNING *
        `;
        
        const user = userResult[0];
        
        // Mark code as used
        await sql`
          UPDATE enrollment_codes 
          SET status = 'used', used_at = NOW(), used_by_user_id = ${user.user_id} 
          WHERE code_id = ${code.code_id}
        `;
        
        // Create lab kit for user
        const kitId = `KIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        
        await sql`
          INSERT INTO lab_kits (user_id, kit_identifier, status, shipped_at)
          VALUES (${user.user_id}, ${kitId}, 'shipped', NOW())
        `;
        
        // Create prescription for first user only
        if (i === 0) {
          await sql`
            INSERT INTO prescriptions (user_id, medication, dosage, prescriber)
            VALUES (${user.user_id}, 'Semaglutide', '1mg weekly', 'Dr. Example')
          `;
        }
      }
    }
    
    console.log('Seed operation completed successfully');
    
    res.json({ 
      success: true,
      message: 'Demo data created successfully',
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    });
    
  } catch (error) {
    console.error('Demo seeding error:', error);
    return res.status(500).json({ 
      error: 'Failed to create demo data', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    version: '1.0.1', // Version indicator
    database: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Test database connection
    sql`SELECT NOW()`.then(result => {
      console.log('Database connected successfully at:', result[0].now);
    }).catch(err => {
      console.error('Database connection error:', err);
    });
  });
}

// Export for Vercel
module.exports = app;
