const axios = require('axios');

async function test() {
  try {
    // 1. Login as coordinator
    const loginRes = await axios.post('http://localhost:5001/api/v1/auth/login', {
      username: 'deepak.c', // assuming deepak is coordinator
      password: 'password123'
    });
    
    const token = loginRes.data.response.token;
    console.log('Logged in successfully');

    // 2. Get menus
    const menuRes = await axios.get('http://localhost:5001/api/v1/menus', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Menus for Coordinator:');
    const menus = menuRes.data.response || menuRes.data;
    menus.forEach(m => console.log(`- ${m.menu_name} (${m.menu_link})`));
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
