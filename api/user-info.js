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
      return res.status(400).json({ error: 'User ID обязателен' });
    }

    // Get user info with HWID
    const userResult = await pool.query(
      'SELECT id, username, email, hwid, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];

    // Get license info
    const licenseResult = await pool.query(
      'SELECT * FROM license_keys WHERE user_id = $1',
      [userId]
    );

    return res.status(200).json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        hwid: user.hwid || null,
        created_at: user.created_at
      },
      hasLicense: licenseResult.rows.length > 0,
      license: licenseResult.rows[0] || null
    });

  } catch (error) {
    console.error('User info error:', error);
    return res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}
