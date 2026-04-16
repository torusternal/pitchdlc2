import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Generate 5 permanent keys
const PERMANENT_KEYS = [
  'PITCH-LIFETIME-7X9K2M4N8P',
  'PITCH-LIFETIME-3Q5W7E9R1T',
  'PITCH-LIFETIME-6Y8U2I4O5P',
  'PITCH-LIFETIME-1A3S5D7F9G',
  'PITCH-LIFETIME-4H6J8K1L2Z'
];

async function initializeKeys() {
  try {
    // Create keys table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'lifetime',
        user_id TEXT,
        activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Insert permanent keys if not exist
    for (const key of PERMANENT_KEYS) {
      try {
        await pool.query(
          'INSERT INTO license_keys (key, type) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
          [key, 'lifetime']
        );
      } catch (e) {
        // Key already exists, skip
      }
    }
    console.log('License keys initialized');
  } catch (error) {
    console.error('Error initializing keys:', error);
  }
}

// Initialize keys on module load
initializeKeys();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { key, userId } = req.body;
    
    // Validate input
    if (!key || !userId) {
      return res.status(400).json({ error: 'Ключ и ID пользователя обязательны' });
    }

    // Check if key exists and is not activated
    const keyResult = await pool.query(
      'SELECT * FROM license_keys WHERE key = $1',
      [key]
    );
    
    if (keyResult.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный ключ' });
    }

    const keyData = keyResult.rows[0];
    
    if (keyData.user_id) {
      return res.status(400).json({ error: 'Ключ уже активирован' });
    }

    // Activate key
    await pool.query(
      'UPDATE license_keys SET user_id = $1, activated_at = CURRENT_TIMESTAMP WHERE key = $2',
      [userId, key]
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Ключ успешно активирован',
      license: {
        key: keyData.key,
        type: keyData.type,
        activated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Activation error:', error);
    return res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}
