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
      SELECT 
        COUNT(st.student_id) as total_students,
        COUNT(DISTINCT st.student_id) as distinct_students,
        COUNT(o.student_id) as total_responses,
        COUNT(DISTINCT o.student_id) as distinct_responses_students,
        COUNT(IF(o.status = 1, o.student_id, NULL)) as total_completed_responses,
        COUNT(DISTINCT IF(o.status = 1, o.student_id, NULL)) as distinct_completed_students
      FROM student_master st
      LEFT JOIN omr_student_response o ON o.student_id = st.student_id
  `;
  const result = await AppDataSource.query(query);
  console.log(result);
  process.exit(0);
}).catch(console.error);
