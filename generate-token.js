const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 24, username: 'ramesh@yopmail.com', role: 4 },
  'super_secret_jwt_key_here',
  { expiresIn: '1h' }
);
console.log(token);
