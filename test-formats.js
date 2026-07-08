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
  const mappings = await AppDataSource.query(`SELECT * FROM teacher_grade_section_mappings LIMIT 5`);
  console.log("Mappings:", mappings);
  
  const students = await AppDataSource.query(`SELECT student_id, udise_code, grade, grade_id, section FROM student_master LIMIT 5`);
  console.log("Students:", students);
  
  process.exit(0);
}).catch(console.error);
