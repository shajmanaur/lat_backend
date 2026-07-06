import * as mysql from 'mysql2/promise';
import { encrypt } from './src/utils/encryption';

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

  // Check if exists
  const [existing] = await connection.execute(`SELECT * FROM user_master WHERE user_name = ?`, [username]);
  if ((existing as any[]).length > 0) {
    console.log(`Teacher already exists! User ID: ${(existing as any[])[0].user_id}`);
    await connection.end();
    return;
  }

  // Create User
  const [userResult] = await connection.execute(
    `INSERT INTO user_master (user_name, password, status, created_by) VALUES (?, ?, '1', 1)`,
    [username, encryptedPassword]
  );
  
  const userId = (userResult as any).insertId;

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
