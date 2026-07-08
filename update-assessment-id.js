const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: '192.168.0.131',
  port: 3306,
  username: 'lat_second_user',
  password: 'lat@222',
  database: 'lat_second_staging',
});

AppDataSource.initialize().then(async () => {
  try {
    // Check if column exists
    const checkCol = await AppDataSource.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'omr_question_master' 
      AND column_name = 'assessment_id' 
      AND table_schema = 'lat_second_staging'
    `);
    
    if (checkCol[0].count === '0' || checkCol[0].count === 0) {
      console.log('Adding assessment_id column...');
      await AppDataSource.query(`ALTER TABLE omr_question_master ADD COLUMN assessment_id BIGINT UNSIGNED DEFAULT 2`);
    } else {
      console.log('Column assessment_id already exists.');
    }

    // Update existing rows to 2 where assessment_id is null or not 2
    console.log('Updating existing records to assessment_id = 2...');
    const result = await AppDataSource.query(`UPDATE omr_question_master SET assessment_id = 2 WHERE assessment_id IS NULL OR assessment_id != 2`);
    console.log(`Updated ${result.affectedRows} rows.`);

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
});
