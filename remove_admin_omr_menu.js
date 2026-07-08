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
    const [menus] = await conn.execute("SELECT * FROM menu_master WHERE menu_link = '/omr'");
    if (menus.length === 0) {
      console.log("No menu found with menu_link '/omr'");
    } else {
      for (const menu of menus) {
        console.log(`Found menu: ${menu.menu_name} (ID: ${menu.id})`);
        const [result] = await conn.execute("DELETE FROM role_menu_mapping WHERE role_id = 2 AND menu_id = ?", [menu.id]);
        console.log(`Deleted ${result.affectedRows} mappings for role 2.`);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await conn.end();
  }
}
main();
