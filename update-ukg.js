const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const con = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST,
    user: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE
  });
  try {
    const [result] = await con.query("UPDATE student_master SET grade = 'iii' WHERE grade = 'ukg'");
    console.log('Updated rows:', result.affectedRows);
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}
run();
