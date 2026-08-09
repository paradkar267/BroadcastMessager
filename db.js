// db.js - Neon PostgreSQL Connection & Schema Initialization Module
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Auto Create Tables on Startup
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Customers Table (Per-Owner Isolated)
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        account_id INT DEFAULT 1,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        tag VARCHAR(100) DEFAULT 'Customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure account_id column exists for existing tables
    await client.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_id INT DEFAULT 1;
    `);

    // 2. Campaigns Table (Per-Owner Isolated)
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(50) PRIMARY KEY,
        account_id INT DEFAULT 1,
        name VARCHAR(255) NOT NULL,
        template_name VARCHAR(100),
        target_segment VARCHAR(100),
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        read_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS account_id INT DEFAULT 1;
    `);

    // 3. Campaign Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_logs (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(50) REFERENCES campaigns(id) ON DELETE CASCADE,
        msg_id VARCHAR(100),
        customer_name VARCHAR(255),
        phone VARCHAR(50),
        status VARCHAR(50),
        message_text TEXT,
        error_details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. API Settings / Multi-Owner Accounts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_accounts (
        id SERIAL PRIMARY KEY,
        profile_name VARCHAR(255) NOT NULL,
        api_token TEXT NOT NULL,
        phone_id VARCHAR(100) NOT NULL,
        waba_id VARCHAR(100),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_settings (
        id INT PRIMARY KEY DEFAULT 1,
        api_token TEXT,
        phone_id VARCHAR(100),
        waba_id VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure initial API Settings row exists
    await client.query(`
      INSERT INTO api_settings (id, api_token, phone_id, waba_id)
      VALUES (1, $1, $2, $3)
      ON CONFLICT (id) DO NOTHING;
    `, [process.env.META_ACCESS_TOKEN || '', process.env.META_PHONE_ID || '', process.env.META_WABA_ID || '']);

    await client.query('COMMIT');
    console.log('✅ Neon PostgreSQL Database Initialized & Tables Verified Successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database Initialization Error:', err);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDB
};
