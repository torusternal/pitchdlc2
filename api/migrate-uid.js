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
    const { email, adminKey } = req.body;
    
    // Простая проверка админа (можно заменить на нормальную)
    if (adminKey !== 'pitch_admin_2024') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create sequence if not exists
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1
    `);

    // Get next ID from sequence
    const seqResult = await pool.query('SELECT nextval(\'user_id_seq\')');
    const newUserId = seqResult.rows[0].nextval.toString();

    // Update user UID
    const result = await pool.query(
      'UPDATE users SET id = $1 WHERE email = $2 RETURNING *',
      [newUserId, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `UID обновлен: ${newUserId}`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}
