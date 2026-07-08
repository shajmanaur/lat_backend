const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'assessment_db',
});

AppDataSource.initialize().then(async () => {
  const query = `
      SELECT * FROM teacher_grade_section_mappings LIMIT 5
  `;
  const result = await AppDataSource.query(query);
  console.log(result);
  
  const teacherQuery = `
      SELECT t.*, u.user_id FROM teacher_master t
      JOIN user_master u ON t.user_id = u.user_id
      WHERE u.role_id = 4 LIMIT 2
  `;
  const tResult = await AppDataSource.query(teacherQuery);
  console.log("Teachers:", tResult);
  
  process.exit(0);
}).catch(console.error);
