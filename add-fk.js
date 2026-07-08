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
    console.log('Adding Foreign Key constraint...');
    await AppDataSource.query(`
      ALTER TABLE omr_question_master 
      ADD CONSTRAINT fk_omr_question_assessment 
      FOREIGN KEY (assessment_id) REFERENCES assessment_master(assessment_id) 
      ON DELETE SET NULL
    `);
    console.log('Foreign Key constraint added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('Foreign key constraint already exists.');
    } else {
      console.error('Error adding constraint:', err.message);
    }
  } finally {
    process.exit(0);
  }
});
