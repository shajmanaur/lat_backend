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
  
  const roleId = 2; // Admin
  // Menus to add: 3 (Students), 9 (Teacher List), 10 (Teacher Allocation), 11 (Student List), 12 (Add OMR Result)
  const menuIdsToAdd = [3, 9, 10, 11, 12];
  
  for (const menuId of menuIdsToAdd) {
    try {
      await conn.execute(
        'INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (?, ?, ?, 1)',
        [roleId, menuId, 10]
      );
      console.log(`Added menu_id ${menuId} to role_id ${roleId}`);
    } catch (e) {
      console.log(`Failed or already exists for menu_id ${menuId}:`, e.message);
    }
  }

  await conn.end();
}
main().catch(console.error);
