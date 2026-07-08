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
  
  const [indexes] = await conn.query('SHOW INDEXES FROM omr_student_response');
  console.log("Indexes:", indexes);
  
  const [explain] = await conn.query('EXPLAIN SELECT COUNT(DISTINCT omr.student_id) AS studentsPresent FROM omr_student_response omr');
  console.log("Explain COUNT:", explain);

  await conn.end();
}
main().catch(console.error);
