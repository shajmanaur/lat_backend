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
  
  console.log("Connected to DB!");
  
  console.time("COUNT(DISTINCT)");
  await conn.query('SELECT COUNT(DISTINCT student_id) FROM omr_student_response');
  console.timeEnd("COUNT(DISTINCT)");

  console.time("COUNT(DISTINCT) with WHERE status=1");
  await conn.query('SELECT COUNT(DISTINCT student_id) FROM omr_student_response WHERE status = 1');
  console.timeEnd("COUNT(DISTINCT) with WHERE status=1");

  await conn.end();
}
main().catch(console.error);
