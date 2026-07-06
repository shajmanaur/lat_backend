const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({
    host: '192.168.0.131',
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging',
    multipleStatements: true
  });

  const sql = `
INSERT IGNORE INTO \`user_type_master\` (\`user_type_id\`, \`user_type_name\`, \`priority\`, \`status\`, \`created_by\`, \`created_at\`, \`updated_by\`, \`updated_at\`) VALUES (1, 'SUPERADMIN', 1, b'1', 1, '2024-10-04 09:13:39', NULL, NULL);
INSERT IGNORE INTO \`user_type_master\` (\`user_type_id\`, \`user_type_name\`, \`priority\`, \`status\`, \`created_by\`, \`created_at\`, \`updated_by\`, \`updated_at\`) VALUES (2, 'ADMIN', 2, b'1', 1, '2024-10-04 09:14:07', NULL, '2024-10-04 09:18:19');
INSERT IGNORE INTO \`user_type_master\` (\`user_type_id\`, \`user_type_name\`, \`priority\`, \`status\`, \`created_by\`, \`created_at\`, \`updated_by\`, \`updated_at\`) VALUES (3, 'CORDINATOR', 3, b'1', 1, '2024-10-04 09:14:42', NULL, '2024-10-04 09:18:21');
INSERT IGNORE INTO \`user_type_master\` (\`user_type_id\`, \`user_type_name\`, \`priority\`, \`status\`, \`created_by\`, \`created_at\`, \`updated_by\`, \`updated_at\`) VALUES (4, 'TEACHER', 4, b'1', 1, '2024-10-04 09:15:31', NULL, '2024-10-04 09:18:22');
INSERT IGNORE INTO \`user_type_master\` (\`user_type_id\`, \`user_type_name\`, \`priority\`, \`status\`, \`created_by\`, \`created_at\`, \`updated_by\`, \`updated_at\`) VALUES (5, 'STUDENT', 5, b'1', 1, '2024-10-04 09:15:44', NULL, '2024-10-04 09:18:24');
  `;

  await con.query(sql);
  console.log('User Type Master data inserted.');
  process.exit(0);
}

run().catch(console.error);
