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
  
  const [menuMaster] = await conn.query('DESCRIBE menu_master');
  console.log("menu_master:", menuMaster);
  
  const [roleMenuMapping] = await conn.query('DESCRIBE role_menu_mapping');
  console.log("role_menu_mapping:", roleMenuMapping);

  const [menus] = await conn.query('SELECT * FROM menu_master');
  console.log("Menus:", menus);

  const [mappings] = await conn.query('SELECT * FROM role_menu_mapping WHERE role_id = 2');
  console.log("Admin Mappings (role 2):", mappings);

  await conn.end();
}
main().catch(console.error);
