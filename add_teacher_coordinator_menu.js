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

  try {
    // 1. Rename menu to 'Student List'
    await conn.execute("UPDATE menu_master SET menu_name = 'Student List' WHERE menu_link = '/students'");
    console.log("Menu renamed to 'Student List'");

    const [menus] = await conn.execute("SELECT id FROM menu_master WHERE menu_link = '/students'");
    if (menus.length > 0) {
      const menuId = menus[0].id;
      
      // 2. Map to Coordinator (role 3)
      const [existing3] = await conn.execute("SELECT * FROM role_menu_mapping WHERE role_id = 3 AND menu_id = ?", [menuId]);
      if (existing3.length === 0) {
        await conn.execute("INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (3, ?, 10, 1)", [menuId]);
        console.log("Mapped 'Student List' to Coordinator (role 3)");
      } else {
        console.log("'Student List' already mapped to Coordinator.");
      }

      // 3. Map to Teacher (role 4)
      const [existing4] = await conn.execute("SELECT * FROM role_menu_mapping WHERE role_id = 4 AND menu_id = ?", [menuId]);
      if (existing4.length === 0) {
        await conn.execute("INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (4, ?, 10, 1)", [menuId]);
        console.log("Mapped 'Student List' to Teacher (role 4)");
      } else {
        console.log("'Student List' already mapped to Teacher.");
      }
    } else {
      console.log("Menu '/students' not found.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await conn.end();
  }
}
main();
