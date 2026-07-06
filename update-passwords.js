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

async function updatePasswords() {
  const connection = await mysql.createConnection({
    host: '192.168.0.131',
    port: 3306,
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging'
  });

  const commonPassword = 'password123';
  const encryptedPassword = encrypt(commonPassword);

  console.log(`Setting all user passwords to: ${commonPassword}`);
  console.log(`Encrypted Hash: ${encryptedPassword}`);
  
  const [result] = await connection.execute(
    `UPDATE user_master SET password = ? WHERE email = 'shad@yopmail.com' OR user_name LIKE 'Teacher_%'`,
    [encryptedPassword]
  );
  
  console.log(`Successfully updated ${result.affectedRows} users!`);
  await connection.end();
}

updatePasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
