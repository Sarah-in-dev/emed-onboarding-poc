// server.js - Main backend API implementation
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS with more detailed settings
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://emed-onboarding-poc-frontend.vercel.app' // Add your actual deployed frontend URL
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

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnathorized: false
  }
});

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
    
    const result = await pool.query(
      'SELECT * FROM company_admins WHERE admin_id = $1 AND company_id = $2 AND active = TRUE',
      [admin_id, company_id]
    );
    
    if (result.rows.length === 0) {
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
    const result = await pool.query(
      'SELECT * FROM company_admins WHERE email = $1 AND active = TRUE',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get company info
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE company_id = $1',
      [admin.company_id]
    );
    
    const company = companyResult.rows[0];
    
    // Update last login timestamp
    await pool.query(
      'UPDATE company_admins SET last_login = NOW() WHERE admin_id = $1',
      [admin.admin_id]
    );
    
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
    await client.query('ROLLBACK');
    console.error('Provisioning error:', error);
    res.status(500).json({ error: 'Failed to provision company portal' });
  } finally {
    client.release();
  }
});

// ===== ENROLLMENT CODE ROUTES =====

// Generate enrollment codes
app.post('/api/codes/generate', authenticateToken, isCompanyAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { quantity, notes = '' } = req.body;
    const { company_id, admin_id } = req.user;
    
    // Get company info for prefix
    const companyResult = await client.query(
      'SELECT name FROM companies WHERE company_id = $1',
      [company_id]
    );
    
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const companyName = companyResult.rows[0].name;
    const companyPrefix = companyName.substring(0, 3).toUpperCase();
    
    // Get GLP1 program ID
    const programResult = await client.query(
      'SELECT program_id FROM programs WHERE code = $1',
      ['GLP1']
    );
    
    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    const programId = programResult.rows[0].program_id;
    
    await client.query('BEGIN');
    
    // Create batch record
    const batchResult = await client.query(
      'INSERT INTO code_batches (company_id, program_id, quantity, created_by, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [company_id, programId, quantity, admin_id, notes]
    );
    
    const batchId = batchResult.rows[0].batch_id;
    
    // Generate and insert codes
    const codes = [];
    
    for (let i = 0; i < quantity; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${companyPrefix}-GLP1-${randomPart}`;
      
      const codeResult = await client.query(
        'INSERT INTO enrollment_codes (code, company_id, program_id, created_by, batch_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [code, company_id, programId, admin_id, batchId]
      );
      
      codes.push(codeResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      batch_id: batchId,
      company_id: company_id,
      program_id: programId,
      quantity: quantity,
      codes: codes.map(c => c.code)
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Code generation error:', error);
    res.status(500).json({ error: 'Failed to generate enrollment codes' });
  } finally {
    client.release();
  }
});

// Get enrollment codes for company
app.get('/api/codes', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    const { batch_id, status } = req.query;
    
    let query = 'SELECT * FROM enrollment_codes WHERE company_id = $1';
    const params = [company_id];
    
    if (batch_id) {
      query += ' AND batch_id = $2';
      params.push(batch_id);
    }
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching codes:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get code batches
app.get('/api/code-batches', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    
    const batchesResult = await pool.query(
      `SELECT b.*, 
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'active') as active_count,
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'used') as used_count,
       (SELECT COUNT(*) FROM enrollment_codes WHERE batch_id = b.batch_id AND status = 'expired') as expired_count,
       a.name as created_by_name
       FROM code_batches b
       LEFT JOIN company_admins a ON b.created_by = a.admin_id
       WHERE b.company_id = $1
       ORDER BY b.created_at DESC`,
      [company_id]
    );
    
    res.json(batchesResult.rows);
    
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
    
    const result = await pool.query(
      `SELECT c.*, p.name as program_name, p.description as program_description, 
       comp.name as company_name
       FROM enrollment_codes c
       JOIN programs p ON c.program_id = p.program_id
       JOIN companies comp ON c.company_id = comp.company_id
       WHERE c.code = $1 AND c.status = 'active'`,
      [code]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired code' });
    }
    
    const codeInfo = result.rows[0];
    
    // Check if code is expired
    if (codeInfo.expires_at && new Date(codeInfo.expires_at) < new Date()) {
      await pool.query(
        "UPDATE enrollment_codes SET status = 'expired' WHERE code_id = $1",
        [codeInfo.code_id]
      );
      
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
  const client = await pool.connect();
  
  try {
    const { 
      code, 
      name, 
      email, 
      phone, 
      dateOfBirth, 
      address 
    } = req.body;
    
    await client.query('BEGIN');
    
    // Validate code again (in case it was used while form was being filled out)
    const codeResult = await client.query(
      "SELECT * FROM enrollment_codes WHERE code = $1 AND status = 'active'",
      [code]
    );
    
    if (codeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired enrollment code' });
    }
    
    const codeInfo = codeResult.rows[0];
    
    // Create eMed identifier
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const emedIdentifier = `eMED-${codeInfo.company_id}-${randomPart}`;
    
    // Create user record
    const userResult = await client.query(
      `INSERT INTO enrolled_users 
       (company_id, program_id, enrollment_code_id, name, email, phone, date_of_birth, address, emed_identifier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        codeInfo.company_id,
        codeInfo.program_id,
        codeInfo.code_id,
        name,
        email,
        phone,
        dateOfBirth,
        address,
        emedIdentifier
      ]
    );
    
    const user = userResult.rows[0];
    
    // Update code status
    await client.query(
      "UPDATE enrollment_codes SET status = 'used', used_at = NOW(), used_by_user_id = $1 WHERE code_id = $2",
      [user.user_id, codeInfo.code_id]
    );
    
    // Create lab kit record
    const kitIdentifier = `KIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    await client.query(
      "INSERT INTO lab_kits (user_id, kit_identifier, status) VALUES ($1, $2, 'ordered')",
      [user.user_id, kitIdentifier]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      enrollment_date: user.enrollment_date,
      emed_identifier: user.emed_identifier
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  } finally {
    client.release();
  }
});

// ===== COMPANY ADMIN DASHBOARD =====

// Get company metrics
app.get('/api/metrics', authenticateToken, isCompanyAdmin, async (req, res) => {
  try {
    const { company_id } = req.user;
    
    // Get total employees (from company profile, not enrolled users)
    const companyResult = await pool.query(
      'SELECT size FROM companies WHERE company_id = $1',
      [company_id]
    );
    
    const company = companyResult.rows[0];
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
    const metricsResult = await pool.query(
      `SELECT 
       (SELECT COUNT(*) FROM enrolled_users WHERE company_id = $1) as total_enrolled,
       (SELECT COUNT(*) FROM enrolled_users WHERE company_id = $1 AND status = 'active') as active_users,
       (SELECT COUNT(*) FROM lab_kits k JOIN enrolled_users u ON k.user_id = u.user_id 
        WHERE u.company_id = $1 AND k.status = 'shipped') as kits_shipped,
       (SELECT COUNT(*) FROM lab_kits k JOIN enrolled_users u ON k.user_id = u.user_id 
        WHERE u.company_id = $1 AND k.status = 'processed') as kits_processed,
       (SELECT COUNT(*) FROM prescriptions p JOIN enrolled_users u ON p.user_id = u.user_id 
        WHERE u.company_id = $1) as total_prescriptions`,
      [company_id]
    );
    
    const metrics = metricsResult.rows[0];
    
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
    
    let query = `
      SELECT u.*, 
      (SELECT MAX(last_login) FROM company_admins WHERE company_id = u.company_id) as last_activity
      FROM enrolled_users u
      WHERE u.company_id = $1
    `;
    
    const params = [company_id];
    
    if (status) {
      query += ` AND u.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY u.enrollment_date DESC`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
    
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
    const userResult = await pool.query(
      'SELECT * FROM enrolled_users WHERE user_id = $1 AND company_id = $2',
      [userId, company_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Update user status
    await pool.query(
      "UPDATE enrolled_users SET status = 'inactive' WHERE user_id = $1",
      [userId]
    );
    
    res.json({ success: true, message: 'Employee deactivated successfully' });
    
  } catch (error) {
    console.error('Deactivation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== LAB AND TELEHEALTH WEBHOOK ENDPOINTS =====

// Lab result webhook (would be called by lab partner)
app.post('/api/webhooks/lab-results', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { kit_identifier, result_data } = req.body;
    
    await client.query('BEGIN');
    
    // Find kit and associated user
    const kitResult = await client.query(
      'SELECT * FROM lab_kits WHERE kit_identifier = $1',
      [kit_identifier]
    );
    
    if (kitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lab kit not found' });
    }
    
    const kit = kitResult.rows[0];
    
    // Update kit status
    await client.query(
      "UPDATE lab_kits SET status = 'processed', processed_at = NOW() WHERE kit_id = $1",
      [kit.kit_id]
    );
    
    // Store lab results
    await client.query(
      'INSERT INTO lab_results (user_id, kit_id, result_data) VALUES ($1, $2, $3)',
      [kit.user_id, kit.kit_id, result_data]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lab result webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Telehealth review webhook (would be called by telehealth partner)
app.post('/api/webhooks/telehealth-review', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      emed_identifier, 
      provider_id, 
      provider_name, 
      decision,
      notes,
      prescription_details 
    } = req.body;
    
    await client.query('BEGIN');
    
    // Find user by eMed identifier
    const userResult = await client.query(
      'SELECT * FROM enrolled_users WHERE emed_identifier = $1',
      [emed_identifier]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Record telehealth review
    const reviewResult = await client.query(
      `INSERT INTO telehealth_reviews 
       (user_id, provider_id, provider_name, decision, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.user_id, provider_id, provider_name, decision, notes]
    );
    
    const review = reviewResult.rows[0];
    
    // If approved with prescription, create prescription record
    if (decision === 'approved' && prescription_details) {
      const rxIdentifier = `RX-${user.company_id}-${user.user_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      await client.query(
        `INSERT INTO prescriptions 
         (user_id, telehealth_review_id, medication, dosage, quantity, refills, rx_identifier)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.user_id,
          review.review_id,
          prescription_details.medication,
          prescription_details.dosage,
          prescription_details.quantity,
          prescription_details.refills,
          rxIdentifier
        ]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Telehealth review webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Pharmacy webhook (would be called by pharmacy partner)
app.post('/api/webhooks/pharmacy-update', async (req, res) => {
  try {
    const { 
      rx_identifier, 
      status, 
      pharmacy_order_id,
      tracking_number,
      carrier
    } = req.body;
    
    // Update prescription status
    await pool.query(
      'UPDATE prescriptions SET status = $1, pharmacy_order_id = $2 WHERE rx_identifier = $3',
      [status, pharmacy_order_id, rx_identifier]
    );
    
    // If shipped, create shipping record
    if (status === 'shipped' && tracking_number) {
      const prescriptionResult = await pool.query(
        'SELECT prescription_id FROM prescriptions WHERE rx_identifier = $1',
        [rx_identifier]
      );
      
      if (prescriptionResult.rows.length > 0) {
        const prescriptionId = prescriptionResult.rows[0].prescription_id;
        
        await pool.query(
          `INSERT INTO shipments
           (prescription_id, carrier, tracking_number, shipped_at, status)
           VALUES ($1, $2, $3, NOW(), 'in_transit')`,
          [prescriptionId, carrier, tracking_number]
        );
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Pharmacy webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== SEEDING DUMMY DATA =====

// Create and seed database with dummy data (for testing)
app.post('/api/seed', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development' && process.env.ALLOW_SEED !== 'true') {
      return res.status(403).json({ error: 'Operation not allowed in production' });
    }
    
    await client.query('BEGIN');
    
    // Check if GLP1 program exists, create if not
    const checkProgram = await client.query("SELECT * FROM programs WHERE code = 'GLP1'");
    
    if (checkProgram.rows.length === 0) {
      await client.query(
        `INSERT INTO programs (code, name, description, active) 
         VALUES ('GLP1', 'GLP-1 Medication Program', 'Chronic care management program for GLP-1 medications', TRUE)`
      );
    }
    
    // Create dummy company
    const companyResult = await client.query(
      `INSERT INTO companies (name, address, industry, size) 
       VALUES ('Acme Corporation', '123 Main St, Anytown, USA', 'Technology', '201-500')
       RETURNING *`
    );
    
    const company = companyResult.rows[0];
    
    // Create admin user
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await client.query(
      `INSERT INTO company_admins (company_id, name, email, title, password_hash)
       VALUES ($1, 'John Admin', 'admin@acme.com', 'HR Director', $2)`,
      [company.company_id, passwordHash]
    );
    
    // Get GLP1 program
    const programResult = await client.query("SELECT * FROM programs WHERE code = 'GLP1'");
    const program = programResult.rows[0];
    
    // Create batch of codes
    const batchResult = await client.query(
      `INSERT INTO code_batches (company_id, program_id, quantity, notes)
       VALUES ($1, $2, 100, 'Initial batch')
       RETURNING *`,
      [company.company_id, program.program_id]
    );
    
    const batch = batchResult.rows[0];
    
    // Generate 100 codes
    for (let i = 0; i < 100; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `ACM-GLP1-${randomPart}`;
      
      await client.query(
        `INSERT INTO enrollment_codes (code, company_id, program_id, batch_id)
         VALUES ($1, $2, $3, $4)`,
        [code, company.company_id, program.program_id, batch.batch_id]
      );
    }
    
    // Enroll 30 dummy employees
    for (let i = 0; i < 30; i++) {
      // Get a code to use
      const codeResult = await client.query(
        `SELECT * FROM enrollment_codes
         WHERE company_id = $1 AND status = 'active'
         LIMIT 1`,
        [company.company_id]
      );
      
      if (codeResult.rows.length === 0) break;
      
      const code = codeResult.rows[0];
      
      // Create dummy user
      const emedIdentifier = `eMED-${company.company_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const userResult = await client.query(
        `INSERT INTO enrolled_users
         (company_id, program_id, enrollment_code_id, name, email, phone, date_of_birth, emed_identifier, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	RETURNING *`,
        [
          company.company_id,
          program.program_id,
          code.code_id,
          `Test User ${i+1}`,
          `user${i+1}@example.com`,
          '555-123-4567',
          new Date(1980, 0, 1),
          emedIdentifier,
          i < 27 ? 'active' : 'inactive'
        ]
      );
      
      const user = userResult.rows[0];
      
      // Mark code as used
      await client.query(
        `UPDATE enrollment_codes
         SET status = 'used', used_at = NOW(), used_by_user_id = $1
         WHERE code_id = $2`,
        [user.user_id, code.code_id]
      );
      
      // Create lab kit for each user
      const kitIdentifier = `KIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      await client.query(
        `INSERT INTO lab_kits
         (user_id, kit_identifier, status, ordered_at, shipped_at)
         VALUES ($1, $2, $3, NOW(), NOW() - INTERVAL '3 days')`,
        [user.user_id, kitIdentifier, i < 20 ? 'processed' : 'shipped']
      );
      
      // For some users, create telehealth reviews and prescriptions
      if (i < 15) {
        const reviewResult = await client.query(
          `INSERT INTO telehealth_reviews
           (user_id, provider_id, provider_name, decision, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            user.user_id,
            'PROV-12345',
            'Dr. Smith',
            'approved',
            'Patient approved for GLP-1 medication'
          ]
        );
        
        const review = reviewResult.rows[0];
        
        const rxIdentifier = `RX-${company.company_id}-${user.user_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        await client.query(
          `INSERT INTO prescriptions
           (user_id, telehealth_review_id, medication, dosage, quantity, refills, rx_identifier, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            user.user_id,
            review.review_id,
            'Semaglutide',
            '0.25mg weekly',
            4,
            3,
            rxIdentifier,
            i < 10 ? 'shipped' : 'pending'
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true,
      message: 'Dummy data seeded successfully',
      credentials: {
        email: 'admin@acme.com',
        password: 'password123'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  } finally {
    client.release();
  }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
