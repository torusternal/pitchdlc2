import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize HWID column
async function initializeHwidColumn() {
  try {
    // Add hwid column to users table if not exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS hwid TEXT UNIQUE
    `);
    console.log('HWID column initialized');
  } catch (error) {
    console.error('Error initializing HWID column:', error);
  }
}

// Initialize on module load
initializeHwidColumn();

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
    const { userId, hwid, username } = req.body;
    
    // Validate input
    if (!userId || !hwid) {
      return res.status(400).json({ 
        canLaunch: false,
        error: 'User ID и HWID обязательны' 
      });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        canLaunch: false,
        error: 'Пользователь не найден' 
      });
    }

    const user = userResult.rows[0];

    // Check if user has active license
    const licenseResult = await pool.query(
      'SELECT * FROM license_keys WHERE user_id = $1',
      [userId]
    );
    
    if (licenseResult.rows.length === 0) {
      return res.status(403).json({ 
        canLaunch: false,
        error: 'Нет активной лицензии. Активируйте ключ в профиле.' 
      });
    }

    // Check HWID
    if (user.hwid) {
      // HWID already set, check if matches
      if (user.hwid !== hwid) {
        return res.status(403).json({ 
          canLaunch: false,
          error: 'HWID не совпадает. Этот аккаунт привязан к другому устройству.' 
        });
      }
    } else {
      // First launch - save HWID
      await pool.query(
        'UPDATE users SET hwid = $1 WHERE id = $2',
        [hwid, userId]
      );
    }

    // Generate launch token
    const launchToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create launch_tokens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS launch_tokens (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        hwid TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Save launch token
    await pool.query(
      'INSERT INTO launch_tokens (user_id, token, hwid, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, launchToken, hwid, expiresAt]
    );

    return res.status(200).json({ 
      canLaunch: true,
      token: launchToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        hwid: hwid
      },
      license: licenseResult.rows[0]
    });

  } catch (error) {
    console.error('Check launch error:', error);
    return res.status(500).json({ 
      canLaunch: false,
      error: 'Ошибка сервера: ' + error.message 
    });
  }
}
