// backend/db.js
const postgres = require('postgres');

// Log connection attempt for debugging
console.log('Initializing Supabase connection using postgres package');

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false
  }
});

// Export the sql client
module.exports = sql;
