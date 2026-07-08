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
  
  // Change menu 11's link to /admin-students
  await conn.execute("UPDATE menu_master SET menu_link = '/admin-students', menu_name = 'Students (Admin)' WHERE id = 11");
  
  // Make sure Admin (role 2) has menu 11
  try {
    await conn.execute("INSERT INTO role_menu_mapping (role_id, menu_id, created_by) VALUES (2, 11, 10)");
  } catch(e) {}

  // Remove menu 3 from Admin so they don't see duplicate "Students"
  await conn.execute("DELETE FROM role_menu_mapping WHERE role_id = 2 AND menu_id = 3");
  
  console.log("Updated menu 11 to /admin-students and assigned exclusively to Admin");

  await conn.end();
}
main().catch(console.error);
