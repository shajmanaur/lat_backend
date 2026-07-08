const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: '192.168.0.131', user: 'lat_second_user', password: 'lat@222', database: 'lat_second_staging', port: 3306 });
  await conn.execute('DELETE FROM role_menu_mapping WHERE role_id = 4');
  console.log('Deleted old mappings');
  const [allocRes] = await conn.execute('INSERT INTO menu_master (menu_name, menu_link, menu_icon, menu_remarks, status, is_parent, priority, sub_menu, menu_type, created_by) VALUES (?, ?, ?, ?, 1, 1, 2, 0, "S", 10)', ['My Allocations', '/teacher/allocations', 'ClipboardList', 'ASSESSMENT']);
  const allocMenuId = allocRes.insertId;
  const [supportRes] = await conn.execute('INSERT INTO menu_master (menu_name, menu_link, menu_icon, menu_remarks, status, is_parent, priority, sub_menu, menu_type, created_by) VALUES (?, ?, ?, ?, 1, 1, 4, 0, "S", 10)', ['Help & Support', '/support', 'Headphones', 'SUPPORT']);
  const supportMenuId = supportRes.insertId;
  const mappings = [
    [4, 1, 1], // Dashboard
    [4, allocMenuId, 2], // Allocations
    [4, 4, 3], // OMR Entry Status (id=4 in menu_master)
    [4, supportMenuId, 4] // Support
  ];
  for (let i = 0; i < mappings.length; i++) {
    await conn.execute('INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (?, ?, 10, 1)', [mappings[i][0], mappings[i][1]]);
  }
  console.log('Inserted new mappings');
  process.exit();
}
run();
