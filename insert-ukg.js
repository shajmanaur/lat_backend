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
    await con.query("INSERT INTO grade_master (grade_name, priority, status, created_by, created_at, updated_at) VALUES ('UKG', 0, 1, 1, NOW(), NOW())");
    console.log('Inserted UKG');
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}
run();
