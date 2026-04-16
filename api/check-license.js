import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    // Check if user has active license
    const result = await pool.query(
      'SELECT * FROM license_keys WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(200).json({ 
        hasLicense: false,
        message: 'Нет активной лицензии'
      });
    }

    const license = result.rows[0];

    return res.status(200).json({ 
      hasLicense: true,
      license: {
        key: license.key,
        type: license.type,
        activated_at: license.activated_at
      }
    });

  } catch (error) {
    console.error('Check license error:', error);
    return res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}
