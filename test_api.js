const axios = require('axios');

async function test() {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbl9kZW1vIiwicm9sZSI6MiwiaWF0IjoxNzgzNDgzNTEwLCJleHAiOjE3ODM1Njk5MTB9.GoE7h-N8IRuWuteqdocJtI8DT0PVumV0y75tAJSGs9I';
    const statsRes = await axios.get('http://localhost:5001/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Stats Response Data:", JSON.stringify(statsRes.data, null, 2));

  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
test();
