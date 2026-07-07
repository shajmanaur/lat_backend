const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || '127.0.0.1',
    user: process.env.TYPEORM_DB_USERNAME || 'root',
    password: process.env.TYPEORM_DB_PASSWORD || '',
    database: process.env.TYPEORM_DB_DATABASE || 'test',
  });

  try {
    console.log('Connected to DB');

    // 1. Add grade_id column
    console.log('Adding grade_id column...');
    await connection.query('ALTER TABLE `student_master` ADD COLUMN `grade_id` INT UNSIGNED NULL');

    // 2. Map existing grades
    console.log('Mapping existing grades...');
    const [grades] = await connection.query('SELECT * FROM `grade_master`');
    
    for (const g of grades) {
      // Find students whose string grade matches (case-insensitive) the grade_name or roman equivalent
      // Student grades might be 'iii', 'vi', 'ix', 'Grade 3', '3'
      const roman = g.grade_name.toLowerCase();
      let numberStr = '';
      if (roman === 'iii') numberStr = '3';
      if (roman === 'vi') numberStr = '6';
      if (roman === 'ix') numberStr = '9';

      await connection.query(`
        UPDATE \`student_master\`
        SET \`grade_id\` = ?
        WHERE LOWER(\`grade\`) IN (?, ?, ?, ?)
      `, [g.grade_id, roman, numberStr, `grade ${numberStr}`, `0${numberStr}`]);
    }

    // 3. Set foreign key constraint
    console.log('Adding foreign key constraint...');
    await connection.query(`
      ALTER TABLE \`student_master\` 
      ADD CONSTRAINT \`FK_student_grade_id\` 
      FOREIGN KEY (\`grade_id\`) REFERENCES \`grade_master\`(\`grade_id\`) ON DELETE SET NULL
    `);

    // 4. Drop the old column
    // NOTE: For TypeORM safety, we can leave the drop to TypeORM or do it here. We'll do it here.
    console.log('Dropping old grade column...');
    await connection.query('ALTER TABLE `student_master` DROP COLUMN `grade`');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
