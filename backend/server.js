// server.js - Main backend API implementation
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Replace Pool with the postgres package
// const { Pool } = require('pg');
const sql = require('./db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure custom CORS middleware to ensure it works properly
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://emed-onboarding-poc-frontend.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// Company admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin by email
    const adminResult = await sql`
      SELECT * FROM company_admins 
      WHERE email = ${email} 
      AND active = TRUE
    `;
    
    if (adminResult.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = adminResult[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
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
  // Add these CORS headers
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
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
    res.status(500).json({ error: 'Failed to provision company portal' });
  }
});

// ===== ENROLLMENT CODE ROUTES =====

// Generate enrollment codes
app.post('/api/codes/generate', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { quantity, notes = '' } = req.body;
    const { company_id, admin_id } = req.user;
    
    // Get company info for prefix
    const companyResult = await sql`
      SELECT name FROM companies WHERE company_id = ${company_id}
    `;
    
    if (companyResult.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const companyName = companyResult[0].name;
    const companyPrefix = companyName.substring(0, 3).toUpperCase();
    
    // Get GLP1 program ID
    const programResult = await sql`
      SELECT program_id FROM programs WHERE code = ${'GLP1'}
    `;
    
    if (programResult.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    const programId = programResult[0].program_id;
    
    // Start transaction
    const tx = sql.begin();
    
    // Create batch record
    const batchResult = await sql`
      INSERT INTO code_batches (company_id, program_id, quantity, created_by, notes) 
      VALUES (${company_id}, ${programId}, ${quantity}, ${admin_id}, ${notes}) 
      RETURNING *
    `;
    
    const batchId = batchResult[0].batch_id;
    
    // Generate and insert codes
    const codes = [];
    
    for (let i = 0; i < quantity; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${companyPrefix}-GLP1-${randomPart}`;
      
      const codeResult = await sql`
        INSERT INTO enrollment_codes (code, company_id, program_id, created_by, batch_id) 
        VALUES (${code}, ${company_id}, ${programId}, ${admin_id}, ${batchId}) 
        RETURNING *
      `;
      
      codes.push(codeResult[0]);
    }
    
    // Commit transaction
    await tx.commit();
    
    res.status(201).json({
      batch_id: batchId,
      company_id: company_id,
      program_id: programId,
      quantity: quantity,
      codes: codes.map(c => c.code)
    });
    
  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({ error: 'Failed to generate enrollment codes' });
  }
});

// Get enrollment codes for company
app.get('/api/codes', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { batch_id, status } = req.query;
    
    let query = sql`SELECT * FROM enrollment_codes WHERE company_id = ${company_id}`;
    
    if (batch_id) {
      query = sql`${query} AND batch_id = ${batch_id}`;
    }
    
    if (status) {
      query = sql`${query} AND status = ${status}`;
    }
    
    query = sql`${query} ORDER BY created_at DESC`;
    
    const result = await query;
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get code batches
app.get('/api/code-batches', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    
    const batchesResult = await sql`
      SELECT b.*, 
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'active') as active_count,
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'used') as used_count,
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'expired') as expired_count,
       a.name as created_by_name
       FROM code_batches b
       LEFT JOIN company_admins a ON b.created_by = a.admin_id
       WHERE b.company_id = ${company_id}
       ORDER BY b.created_at DESC
    `;
    
    res.json(batchesResult);
    
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== EMPLOYEE ENROLLMENT ROUTES =====

// Validate enrollment code
app.post('/api/codes/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    const result = await sql`
      SELECT c.*, p.name as program_name, p.description as program_description, 
       comp.name as company_name
       FROM enrollment_codes c
       JOIN programs p ON c.program_id = p.program_id
       JOIN companies comp ON c.company_id = comp.company_id
       WHERE c.code = ${code} AND c.status = 'active'
    `;
    
    if (result.length === 0) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired code' });
    }
    
    const codeInfo = result[0];
    
    // Check if code is expired
    if (codeInfo.expires_at && new Date(codeInfo.expires_at) < new Date()) {
      await sql`
        UPDATE enrollment_codes 
        SET status = 'expired' 
        WHERE code_id = ${codeInfo.code_id}
      `;
      
      return res.status(400).json({ valid: false, message: 'Code has expired' });
    }
    
    res.json({
      valid: true,
      company: {
        id: codeInfo.company_id,
        name: codeInfo.company_name
      },
      program: {
        id: codeInfo.program_id,
        name: codeInfo.program_name,
        description: codeInfo.program_description
      }
    });
    
  } catch (error) {
    console.error('Code validation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll user with code
app.post('/api/enroll', async (req, res) => {
  try {
    const { 
      code, 
      name, 
      email, 
      phone, 
      dateOfBirth, 
      address 
    } = req.body;
    
    // Start transaction
    const tx = sql.begin();
    
    // Validate code again (in case it was used while form was being filled out)
    const codeResult = await sql`
      SELECT * FROM enrollment_codes 
      WHERE code = ${code} 
      AND status = 'active'
    `;
    
    if (codeResult.length === 0) {
      await tx.rollback();
      return res.status(400).json({ error: 'Invalid or expired enrollment code' });
    }
    
    const codeInfo = codeResult[0];
    
    // Create eMed identifier
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const emedIdentifier = `eMED-${codeInfo.company_id}-${randomPart}`;
    
    // Create user record
    const userResult = await sql`
      INSERT INTO enrolled_users 
       (company_id, program_id, enrollment_code_id, name, email, phone, date_of_birth, address, emed_identifier)
       VALUES (${codeInfo.company_id}, ${codeInfo.program_id}, ${codeInfo.code_id}, 
               ${name}, ${email}, ${phone}, ${dateOfBirth}, ${address}, ${emedIdentifier})
       RETURNING *
    `;
    
    const user = userResult[0];
    
    // Update code status
    await sql`
      UPDATE enrollment_codes 
      SET status = 'used', used_at = NOW(), used_by_user_id = ${user.user_id} 
      WHERE code_id = ${codeInfo.code_id}
    `;
    
    // Create lab kit record
    const kitIdentifier = `KIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    await sql`
      INSERT INTO lab_kits (user_id, kit_identifier, status) 
      VALUES (${user.user_id}, ${kitIdentifier}, 'ordered')
    `;
    
    // Commit transaction
    await tx.commit();
    
    res.status(201).json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      enrollment_date: user.enrollment_date,
      emed_identifier: user.emed_identifier
    });
    
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// ===== COMPANY ADMIN DASHBOARD =====

// Get company metrics
app.get('/api/metrics', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    
    // Get total employees (from company profile, not enrolled users)
    const companyResult = await sql`
      SELECT size FROM companies WHERE company_id = ${company_id}
    `;
    
    const company = companyResult[0];
    let totalEmployees = 0;
    
    // Convert size range to number (approximate)
    switch (company.size) {
      case '1-50': totalEmployees = 50; break;
      case '51-200': totalEmployees = 200; break;
      case '201-500': totalEmployees = 500; break;
      case '501-1000': totalEmployees = 1000; break;
      case '1001+': totalEmployees = 2000; break;
      default: totalEmployees = 100;
    }
    
    // Get enrollment metrics
    const metricsResult = await sql`
      SELECT 
       (SELECT COUNT(*) FROM enrolled_users WHERE company_id = ${company_id}) as total_enrolled,
       (SELECT COUNT(*) FROM enrolled_users WHERE company_id = ${company_id} AND status = 'active') as active_users,
       (SELECT COUNT(*) FROM lab_kits k JOIN enrolled_users u ON k.user_id = u.user_id 
        WHERE u.company_id = ${company_id} AND k.status = 'shipped') as kits_shipped,
       (SELECT COUNT(*) FROM lab_kits k JOIN enrolled_users u ON k.user_id = u.user_id 
        WHERE u.company_id = ${company_id} AND k.status = 'processed') as kits_processed,
       (SELECT COUNT(*) FROM prescriptions p JOIN enrolled_users u ON p.user_id = u.user_id 
        WHERE u.company_id = ${company_id}) as total_prescriptions
    `;
    
    const metrics = metricsResult[0];
    
    res.json({
      company_id,
      total_employees: totalEmployees,
      total_enrolled: parseInt(metrics.total_enrolled) || 0,
      active_users: parseInt(metrics.active_users) || 0,
      kits_shipped: parseInt(metrics.kits_shipped) || 0,
      kits_processed: parseInt(metrics.kits_processed) || 0,
      total_prescriptions: parseInt(metrics.total_prescriptions) || 0
    });
    
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get enrolled employees
app.get('/api/employees', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { status, search } = req.query;
    
    let queryText = `
      SELECT u.*, 
      (SELECT MAX(last_login) FROM company_admins WHERE company_id = u.company_id) as last_activity
      FROM enrolled_users u
      WHERE u.company_id = ${company_id}
    `;
    
    const queryParams = [];
    
    if (status) {
      queryText += ` AND u.status = ${status}`;
    }
    
    if (search) {
      queryText += ` AND (u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})`;
    }
    
    queryText += ` ORDER BY u.enrollment_date DESC`;
    
    const result = await sql.unsafe(queryText, queryParams);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deactivate employee
app.put('/api/employees/:userId/deactivate', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { company_id } = req.user;
    
    // Verify user belongs to this company
    const userResult = await sql`
      SELECT * FROM enrolled_users 
      WHERE user_id = ${userId} 
      AND company_id = ${company_id}
    `;
    
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Update user status
    await sql`
      UPDATE enrolled_users 
      SET status = 'inactive' 
      WHERE user_id = ${userId}
    `;
    
    res.json({ success: true, message: 'Employee deactivated successfully' });
    
  } catch (error) {
    console.error('Deactivation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== LAB AND TELEHEALTH WEBHOOK ENDPOINTS =====

// Lab result webhook (would be called by lab partner)
app.post('/api/webhooks/lab-results', async (req, res) => {
  try {
    const { kit_identifier, result_data } = req.body;
    
    // Start transaction
    const tx = sql.begin();
    
    // Find kit and associated user
    const kitResult = await sql`
      SELECT * FROM lab_kits 
      WHERE kit_identifier = ${kit_identifier}
    `;
    
    if (kitResult.length === 0) {
      await tx.rollback();
      return res.status(404).json({ error: 'Lab kit not found' });
    }
    
    const kit = kitResult[0];
    
    // Update kit status
    await sql`
      UPDATE lab_kits 
      SET status = 'processed', processed_at = NOW() 
      WHERE kit_id = ${kit.kit_id}
    `;
    
    // Store lab results
    await sql`
      INSERT INTO lab_results (user_id, kit_id, result_data) 
      VALUES (${kit.user_id}, ${kit.kit_id}, ${result_data})
    `;
    
    // Commit transaction
    await tx.commit();
    
    res.status(201).json({ success: true });
    
  } catch (error) {
    console.error('Lab result webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Seeding Routes
app.post('/api/seed', async (req, res) => {
    if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_SEED !== 'true') {
        return res.status(403).json({ error: 'Operation not allowed in production' });
      }
    
      try {
        // Start a transaction
        const tx = sql.begin();
        
        // Ensure GLP1 program exists
        const checkProgram = await sql`SELECT * FROM programs WHERE code = 'GLP1'`;
        
        if (checkProgram.length === 0) {
          await sql`
            INSERT INTO programs (code, name, description, active) 
            VALUES ('GLP1', 'GLP-1 Medication Program', 'Chronic care management program for GLP-1 medications', TRUE)
          `;
        }
        
        // Create a demo company
        const companyResult = await sql`
          INSERT INTO companies (name, address, industry, size) 
          VALUES ('Demo Company', '123 Main St, Anytown, USA', 'Technology', '51-200')
          RETURNING *
        `;
        
        const company = companyResult[0];
        
        // Create demo admin with a predictable but unique email
        const adminEmail = `demo-admin-${Date.now()}@example.com`;
        const passwordHash = await bcrypt.hash('password123', 10);
        
        await sql`
          INSERT INTO company_admins (company_id, name, email, title, password_hash)
          VALUES (${company.company_id}, 'Demo Admin', ${adminEmail}, 'Demo Role', ${passwordHash})
        `;
        
        // Get GLP1 program
        const programResult = await sql`SELECT * FROM programs WHERE code = 'GLP1'`;
        const program = programResult[0];
        
        // Create a small batch of demo codes
        const batchResult = await sql`
          INSERT INTO code_batches (company_id, program_id, quantity, notes)
          VALUES (${company.company_id}, ${program.program_id}, 10, 'Demo batch')
          RETURNING *
        `;
        
        const batch = batchResult[0];
        
        // Generate a few demo codes
        for (let i = 0; i < 10; i++) {
          const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
          const code = `DEMO-GLP1-${randomPart}`;
          
          await sql`
            INSERT INTO enrollment_codes (code, company_id, program_id, batch_id)
            VALUES (${code}, ${company.company_id}, ${program.program_id}, ${batch.batch_id})
          `;
        }
        
        // Commit transaction
        await tx.commit();
        
        res.json({ 
          success: true,
          message: 'Demo data created successfully',
          credentials: {
            email: adminEmail,
            password: 'password123'
          }
        });
        
      } catch (error) {
        console.error('Demo seeding error:', error);
        res.status(500).json({ error: 'Failed to create demo data' });
      }
    });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    database: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Test database connection
  sql`SELECT NOW()`.then(result => {
    console.log('Database connected successfully at:', result[0].now);
  }).catch(err => {
    console.error('Database connection error:', err);
  });
});
