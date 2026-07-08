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
  
  // Remove all mappings for menu 11 and role 2 to clear duplicates
  await conn.execute("DELETE FROM role_menu_mapping WHERE role_id = 2 AND menu_id = 11");
  
  // Insert exactly ONE mapping
  await conn.execute("INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (2, 11, 10, 1)");

  // Double check if menu 3 is still there just in case
  await conn.execute("DELETE FROM role_menu_mapping WHERE role_id = 2 AND menu_id = 3");
  
  console.log("Fixed duplicate menu mappings for Admin");

  await conn.end();
}
main().catch(console.error);
