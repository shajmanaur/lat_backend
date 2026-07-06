const mysql = require('mysql2/promise');
const crypto = require('crypto');

const encryptionKey = 'd73e13b96de08d8b4aee891dc6be97621980e40928d992ca1db964121317e590';
const algorithm = 'aes-256-cbc';
const IV = '0000000000000000';

function encrypt(message) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'utf8'), Buffer.from(IV, 'utf8'));
  let encryptedData = cipher.update(message, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  return encryptedData;
}

async function createTeacher() {
  const connection = await mysql.createConnection({
    host: '192.168.0.131',
    port: 3306,
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging'
  });

  const username = 'teacher_demo';
  const rawPassword = 'teacher123';
  const encryptedPassword = encrypt(rawPassword);

  console.log(`Generating credentials...`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${rawPassword}`);
  console.log(`Encrypted: ${encryptedPassword}`);

  // Create User
  const [userResult] = await connection.execute(
    `INSERT INTO user_master (user_name, password, status, created_by) VALUES (?, ?, '1', 1)`,
    [username, encryptedPassword]
  );
  
  const userId = userResult.insertId;

  // Create Teacher
  await connection.execute(
    `INSERT INTO teacher_master (user_id, first_name, last_name, created_by) VALUES (?, 'Demo', 'Teacher', 1)`,
    [userId]
  );

  console.log(`Teacher successfully created with User ID: ${userId}`);
  await connection.end();
}

createTeacher().catch(err => {
  console.error(err);
  process.exit(1);
});
