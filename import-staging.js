const fs = require('fs');
const mysql = require('mysql2/promise');

async function importToStaging() {
  const connection = await mysql.createConnection({
    host: '192.168.0.131',
    port: 3306,
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging',
    multipleStatements: true
  });

  console.log('Connected to Staging DB successfully.');

  const sql = fs.readFileSync('../local_dump.sql', 'utf8');
  console.log(`Loaded local_dump.sql (${sql.length} bytes). Executing...`);

  await connection.query(sql);

  console.log('Import to staging database completed successfully!');
  await connection.end();
}

importToStaging().catch(err => {
  console.error(err);
  process.exit(1);
});
