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
  
  const [rows] = await conn.execute("SELECT status, COUNT(*) as c FROM student_master GROUP BY status");
  console.log("student_master status:", rows);

  const [tRows] = await conn.execute("SELECT COUNT(*) as c FROM teacher_master");
  console.log("teacher_master count:", tRows);
  
  const [omrRows] = await conn.execute("SELECT COUNT(*) as c FROM omr_student_response");
  console.log("omr_student_response count:", omrRows);

  await conn.end();
}
main().catch(console.error);
