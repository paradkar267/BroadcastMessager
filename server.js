// server.js - Broadcast Miraya Express Backend Server with Neon PostgreSQL & Meta API
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Multer storage configuration for poster uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Helper: Format message text placeholders {name}, {{1}}
function formatTemplateMessage(templateBody, recipientName = 'Valued Guest') {
  let text = templateBody || '';
  return text.replaceAll('{{1}}', recipientName)
             .replaceAll('{name}', recipientName)
             .replaceAll('{NAME}', recipientName)
             .replaceAll('{{name}}', recipientName);
}

// Helper: Get active Meta credentials from DB or .env
async function getMetaCredentials(accountId = null) {
  try {
    if (accountId && accountId !== 'DEFAULT') {
      const accRes = await pool.query('SELECT * FROM api_accounts WHERE id = $1', [accountId]);
      if (accRes.rows.length > 0) {
        const row = accRes.rows[0];
        return {
          apiToken: row.api_token || process.env.META_ACCESS_TOKEN || '',
          phoneId: row.phone_id || process.env.META_PHONE_ID || '',
          wabaId: row.waba_id || process.env.META_WABA_ID || ''
        };
      }
    }

    const res = await pool.query('SELECT * FROM api_settings WHERE id = 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        apiToken: row.api_token || process.env.META_ACCESS_TOKEN || '',
        phoneId: row.phone_id || process.env.META_PHONE_ID || '',
        wabaId: row.waba_id || process.env.META_WABA_ID || ''
      };
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
  return {
    apiToken: process.env.META_ACCESS_TOKEN || '',
    phoneId: process.env.META_PHONE_ID || '',
    wabaId: process.env.META_WABA_ID || ''
  };
}

// Helper: Upload poster buffer to Meta Media API
async function uploadMediaToMeta(fileBuffer, mimeType, phoneId, apiToken) {
  if (!phoneId || !apiToken) return null;
  try {
    const Blob = (await import('node-fetch')).Blob || globalThis.Blob;
    const FormData = (await import('node-fetch')).FormData || globalThis.FormData;
    
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', blob, 'poster.jpg');
    formData.append('type', mimeType);

    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}` },
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.id) {
      return data.id;
    } else {
      console.error('Meta Media Upload Error:', data);
      return null;
    }
  } catch (err) {
    console.error('Media upload exception:', err);
    return null;
  }
}

// Helper: Send single WhatsApp message via Meta Cloud API
async function sendSingleWhatsAppMessage(recipientPhone, messageText, posterUrl = '', metaMediaId = null, phoneId = '', apiToken = '') {
  if (!apiToken || !phoneId) {
    // Simulated dispatch if no credentials configured yet
    return { success: true, messageId: 'WAMID.' + Math.random().toString(36).substring(2, 10).toUpperCase(), status: 'SENT' };
  }

  let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  let payload = {};

  if (metaMediaId) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "image",
      image: { id: metaMediaId, caption: messageText }
    };
  } else if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "image",
      image: { link: posterUrl, caption: messageText }
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { preview_url: false, body: messageText }
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.messages && data.messages.length > 0) {
      return { success: true, messageId: data.messages[0].id, status: 'SENT' };
    } else {
      return { success: false, error: data.error ? data.error.message : 'Meta API Failed', status: 'FAILED' };
    }
  } catch (err) {
    return { success: false, error: err.message, status: 'FAILED' };
  }
}

// API ENDPOINTS

// 1. Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', message: 'Broadcast Miraya Backend Running', dbTime: dbRes.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// 2. Customers Endpoints (Per-Owner Account Isolated)
app.get('/api/customers', async (req, res) => {
  const { account_id } = req.query;
  try {
    let result;
    if (account_id) {
      result = await pool.query('SELECT * FROM customers WHERE account_id = $1 ORDER BY id DESC', [account_id]);
    } else {
      result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, tag, account_id } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and Phone are required' });

  const accId = account_id || 1;
  try {
    const check = await pool.query('SELECT * FROM customers WHERE account_id = $1 AND phone = $2', [accId, phone]);
    let result;
    if (check.rows.length > 0) {
      result = await pool.query(
        'UPDATE customers SET name = $1, tag = $2 WHERE id = $3 RETURNING *',
        [name, tag || 'Customer', check.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO customers (account_id, name, phone, tag) VALUES ($1, $2, $3, $4) RETURNING *',
        [accId, name, phone, tag || 'Customer']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/import', async (req, res) => {
  const { customers, account_id } = req.body;
  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'Customers array required' });
  }

  const accId = account_id || 1;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let imported = 0;
    for (const c of customers) {
      if (c.name && c.phone) {
        const check = await client.query('SELECT id FROM customers WHERE account_id = $1 AND phone = $2', [accId, c.phone]);
        if (check.rows.length > 0) {
          await client.query('UPDATE customers SET name = $1, tag = $2 WHERE id = $3', [c.name, c.tag || 'Customer', check.rows[0].id]);
        } else {
          await client.query(
            'INSERT INTO customers (account_id, name, phone, tag) VALUES ($1, $2, $3, $4)',
            [accId, c.name, c.phone, c.tag || 'Customer']
          );
        }
        imported++;
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, count: imported });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Campaigns Endpoints
app.get('/api/campaigns', async (req, res) => {
  const { account_id } = req.query;
  try {
    let result;
    if (account_id) {
      result = await pool.query('SELECT * FROM campaigns WHERE account_id = $1 ORDER BY created_at DESC', [account_id]);
    } else {
      result = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:id/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaign_logs WHERE campaign_id = $1 ORDER BY id ASC', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Poster Image Upload Endpoint
app.post('/api/upload-media', upload.single('poster'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const accountId = req.body.account_id || null;
  const creds = await getMetaCredentials(accountId);
  
  const metaMediaId = await uploadMediaToMeta(req.file.buffer, req.file.mimetype, creds.phoneId, creds.apiToken);
  res.json({
    success: true,
    metaMediaId: metaMediaId || null,
    filename: req.file.originalname
  });
});

// 5. Execute WhatsApp Broadcast Endpoint
app.post('/api/broadcast', async (req, res) => {
  const { name, targetSegment, recipients, message, posterUrl, account_id } = req.body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided for broadcast' });
  }

  const campaignId = 'CMP-' + Date.now().toString().slice(-6);
  const accId = account_id || 1;
  const creds = await getMetaCredentials(accId);

  let metaMediaId = null;
  // If posterUrl is Base64 string, upload to Meta Media API
  if (posterUrl && posterUrl.startsWith('data:image')) {
    try {
      const base64Data = posterUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const mime = posterUrl.match(/:(.*?);/)[1] || 'image/jpeg';
      metaMediaId = await uploadMediaToMeta(buffer, mime, creds.phoneId, creds.apiToken);
    } catch (e) {
      console.error('Base64 upload error:', e);
    }
  }

  let sentCount = 0;
  let deliveredCount = 0;
  let readCount = 0;
  let failedCount = 0;
  const logs = [];

  for (const c of recipients) {
    const formattedMessage = formatTemplateMessage(message, c.name);
    const result = await sendSingleWhatsAppMessage(c.phone, formattedMessage, posterUrl, metaMediaId, creds.phoneId, creds.apiToken);

    if (result.success) {
      sentCount++;
      deliveredCount++;
      readCount++;
    } else {
      failedCount++;
    }

    logs.push({
      campaignId,
      msgId: result.messageId || ('ERR.' + Math.random().toString(36).substring(2, 8)),
      customerName: c.name,
      phone: c.phone,
      status: result.success ? 'SENT' : 'FAILED',
      messageText: formattedMessage,
      errorDetails: result.error || null
    });

    await new Promise(r => setTimeout(r, 80)); // Throttling
  }

  // Save Campaign & Logs to Neon PostgreSQL Database
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO campaigns (id, account_id, name, template_name, target_segment, total_recipients, sent_count, delivered_count, read_count, failed_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COMPLETED');
    `, [campaignId, accId, name || 'Broadcast Campaign', 'custom_broadcast', targetSegment || 'All', recipients.length, sentCount, deliveredCount, readCount, failedCount]);

    for (const log of logs) {
      await client.query(`
        INSERT INTO campaign_logs (campaign_id, msg_id, customer_name, phone, status, message_text, error_details)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [log.campaignId, log.msgId, log.customerName, log.phone, log.status, log.messageText, log.errorDetails]);
    }
    await client.query('COMMIT');
  } catch (dbErr) {
    await client.query('ROLLBACK');
    console.error('Error saving campaign to Neon DB:', dbErr);
  } finally {
    client.release();
  }

  res.json({
    id: campaignId,
    name,
    totalRecipients: recipients.length,
    sent: sentCount,
    delivered: deliveredCount,
    read: readCount,
    failed: failedCount,
    logs
  });
});

// 6. Settings & Multi-Owner Accounts Endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM api_accounts ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const { id, profileName, apiToken, phoneId, wabaId, isDefault } = req.body;
  if (!profileName || !apiToken || !phoneId) {
    return res.status(400).json({ error: 'Profile Name, Access Token, and Phone ID are required' });
  }

  try {
    if (isDefault) {
      await pool.query('UPDATE api_accounts SET is_default = FALSE');
    }

    let result;
    if (id) {
      result = await pool.query(`
        UPDATE api_accounts 
        SET profile_name = $1, api_token = $2, phone_id = $3, waba_id = $4, is_default = $5
        WHERE id = $6 RETURNING *
      `, [profileName, apiToken, phoneId, wabaId || '', isDefault || false, id]);
    } else {
      result = await pool.query(`
        INSERT INTO api_accounts (profile_name, api_token, phone_id, waba_id, is_default)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `, [profileName, apiToken, phoneId, wabaId || '', isDefault || false]);
    }

    const acc = result.rows[0];

    // If marked default or only account, set active settings
    if (isDefault || !id) {
      await pool.query(`
        INSERT INTO api_settings (id, api_token, phone_id, waba_id)
        VALUES (1, $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET api_token = EXCLUDED.api_token, phone_id = EXCLUDED.phone_id, waba_id = EXCLUDED.waba_id, updated_at = NOW();
      `, [acc.api_token, acc.phone_id, acc.waba_id]);
    }

    res.json(acc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM api_accounts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts/:id/select', async (req, res) => {
  try {
    await pool.query('UPDATE api_accounts SET is_default = FALSE');
    const result = await pool.query('UPDATE api_accounts SET is_default = TRUE WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length > 0) {
      const acc = result.rows[0];
      await pool.query(`
        INSERT INTO api_settings (id, api_token, phone_id, waba_id)
        VALUES (1, $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET api_token = EXCLUDED.api_token, phone_id = EXCLUDED.phone_id, waba_id = EXCLUDED.waba_id, updated_at = NOW();
      `, [acc.api_token, acc.phone_id, acc.waba_id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  const creds = await getMetaCredentials();
  res.json(creds);
});

app.post('/api/settings', async (req, res) => {
  const { apiToken, phoneId, wabaId, profileName } = req.body;
  try {
    await pool.query(`
      INSERT INTO api_settings (id, api_token, phone_id, waba_id)
      VALUES (1, $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET api_token = EXCLUDED.api_token, phone_id = EXCLUDED.phone_id, waba_id = EXCLUDED.waba_id, updated_at = NOW();
    `, [apiToken || '', phoneId || '', wabaId || '']);

    if (profileName) {
      await pool.query(`
        INSERT INTO api_accounts (profile_name, api_token, phone_id, waba_id, is_default)
        VALUES ($1, $2, $3, $4, TRUE)
      `, [profileName, apiToken, phoneId, wabaId || '']);
    }

    res.json({ success: true, message: 'Settings saved to Neon PostgreSQL' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Meta Webhook Verification & Listener Endpoints
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Meta Webhook Verified Successfully');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/api/webhook', (req, res) => {
  console.log('📩 Incoming Meta Webhook Event:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Start Server and Initialize Database
const server = app.listen(PORT, async () => {
  console.log(`🚀 Broadcast Miraya Server running on http://localhost:${PORT}`);
  await initDB();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const ALT_PORT = Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} occupied. Falling back to port http://localhost:${ALT_PORT}...`);
    app.listen(ALT_PORT, async () => {
      console.log(`🚀 Broadcast Miraya Server running on http://localhost:${ALT_PORT}`);
      await initDB();
    });
  } else {
    console.error('Server startup error:', err);
  }
});
