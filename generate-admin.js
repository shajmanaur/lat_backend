const mysql = require('mysql2/promise');
const crypto = require('crypto');

const encryptionKey = 'd73e13b96de08d8b4aee891dc6be97621980e40928d992ca1db964121317e590'.substring(0, 32);
const algorithm = 'aes-256-cbc';
const IV = '0000000000000000';

function encrypt(message) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'utf8'), Buffer.from(IV, 'utf8'));
  let encryptedData = cipher.update(message, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  return encryptedData;
}

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: '192.168.0.131',
    port: 3306,
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging'
  });

  const username = 'admin_demo';
  const rawPassword = 'adminpassword';
  const encryptedPassword = encrypt(rawPassword);

  console.log(`Generating credentials...`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${rawPassword}`);
  
  // Create User with user_type_id = 2 (ADMIN) and role_id = 2 (ADMIN)
  const [userResult] = await connection.execute(
    `INSERT INTO user_master (user_name, password, user_type_id, role_id, status, created_by) VALUES (?, ?, 2, 2, '1', 1)`,
    [username, encryptedPassword]
  );
  
  const userId = userResult.insertId;
  console.log(`Admin successfully created with User ID: ${userId}`);
  await connection.end();
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
