const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST,
    user: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE,
    port: process.env.TYPEORM_DB_PORT
  });
  
  const [rows] = await conn.query('SELECT * FROM omr_student_response LIMIT 1');
  console.log(rows);
  
  if (rows.length > 0) {
    const studentId = rows[0].student_id;
    const [responses] = await conn.query('SELECT * FROM omr_student_response WHERE student_id = ?', [studentId]);
    console.log(responses);
  }

  await conn.end();
}
main().catch(console.error);
