const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const con = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST,
    user: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE,
    port: process.env.TYPEORM_DB_PORT,
    multipleStatements: true
  });

  try {
    console.log("Starting subject_master updates...");
    
    // 1. Delete subject_id = 3 (Mathematics) which has 0 references
    const [delRes] = await con.execute("DELETE FROM subject_master WHERE subject_id = 3");
    console.log("Deleted subject_id = 3 (Mathematics):", delRes.affectedRows, "rows affected.");

    // 2. Rename subject_id = 7 (MATHS) to 'Math'
    const [upRes1] = await con.execute("UPDATE subject_master SET subject_name = 'Math' WHERE subject_id = 7");
    console.log("Renamed subject_id = 7 (MATHS -> Math):", upRes1.affectedRows, "rows affected.");

    // 3. Rename subject_id = 9 (SANSKRIT) to 'Sanskrit'
    const [upRes2] = await con.execute("UPDATE subject_master SET subject_name = 'Sanskrit' WHERE subject_id = 9");
    console.log("Renamed subject_id = 9 (SANSKRIT -> Sanskrit):", upRes2.affectedRows, "rows affected.");

    console.log("✅ Database updates completed successfully!");
  } catch (err) {
    console.error("❌ Error running updates:", err);
  } finally {
    await con.end();
  }
}

run().catch(console.error);
