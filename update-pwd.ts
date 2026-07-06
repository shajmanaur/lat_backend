import { encrypt } from './src/utils/encryption';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const password = '7017798103';
  const encrypted = encrypt(password);
  console.log('Encrypted password:', encrypted);

  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || 'localhost',
    user: process.env.TYPEORM_DB_USERNAME || 'root',
    password: process.env.TYPEORM_DB_PASSWORD || '',
    database: process.env.TYPEORM_DB_DATABASE || 'data_entry'
  });

  const [result] = await connection.execute(
    'UPDATE user_master SET password = ? WHERE user_name = ?',
    [encrypted, 'stest@yopmail.com']
  );

  console.log('Update result:', result);
  await connection.end();
}

run().catch(console.error);
