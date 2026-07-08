const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/v1/regions',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidXNlcm5hbWUiOiJhZG1pbl9kZW1vIiwicm9sZSI6MiwiaWF0IjoxNzgzNDkyMzQzLCJleHAiOjE3ODM1Nzg3NDN9.qR04MTrnd6DuMygSuHzXbaUYBGDE2-0t6VfjEA7Hnjw'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
