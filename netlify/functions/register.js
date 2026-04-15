const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { username, email, password } = JSON.parse(event.body);
    
    // Validate input
    if (!username || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Все поля обязательны' })
      };
    }

    // Read existing users
    const usersFile = path.join('/tmp', 'users.json');
    let users = [];
    
    try {
      if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      }
    } catch (e) {
      users = [];
    }

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Аккаунт с таким email уже существует' })
      };
    }

    // Add new user
    const user = {
      id: Date.now().toString(),
      username,
      email,
      password, // In production, hash this!
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    // Save users
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        user: { id: user.id, username: user.username, email: user.email }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ошибка сервера' })
    };
  }
};
