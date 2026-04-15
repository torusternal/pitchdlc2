const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oqpJuBx9VmI4@ep-morning-tooth-a7lqm7cq-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  console.log('Register function called');
  console.log('Event:', JSON.stringify(event));

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request');
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    console.log('Parsing request body');
    const { username, email, password } = JSON.parse(event.body);
    console.log('Received:', { username, email });
    
    // Validate input
    if (!username || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Все поля обязательны' })
      };
    }

    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Аккаунт с таким email уже существует' })
      };
    }

    // Add new user
    const userId = Date.now().toString();
    await pool.query(
      'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)',
      [userId, username, email, password]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        user: { id: userId, username, email }
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ошибка сервера: ' + error.message })
    };
  }
};
