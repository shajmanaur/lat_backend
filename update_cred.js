const crypto = require('crypto');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const IV = process.env.ENCRYPTION_KEY.substring(0, 16);
const encryptionKey = process.env.ENCRYPTION_KEY.substring(0, 32);

const encrypt = (message) => {
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, IV);
  var encryptedData = cipher.update(message, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  return encryptedData;
}

const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST,
    user: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE
  });
  
  const newPass = 'password123';
  const encPass = encrypt(newPass);
  
  const [result] = await con.execute('UPDATE user_master SET password = ? WHERE user_name = ?', [encPass, 'shad@yopmail.com']);
  console.log('Updated password to: ' + newPass + '. Rows affected: ' + result.affectedRows);
  
  con.destroy();
}
run().catch(console.error);
