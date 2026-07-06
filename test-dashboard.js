const axios = require('axios');

async function test() {
  try {
    // Login as shad
    const loginRes = await axios.post('http://localhost:5001/api/v1/auth/login', {
      username: 'shad@yopmail.com',
      password: 'password123'
    });
    
    const token = loginRes.data.access_token || loginRes.data.data?.access_token || loginRes.data.token;
    if (!token) console.log(loginRes.data);
    
    // Get stats
    const statsRes = await axios.get('http://localhost:5001/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(statsRes.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
