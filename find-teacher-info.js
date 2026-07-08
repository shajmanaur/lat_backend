const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({
    host: '192.168.0.131',
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging',
    multipleStatements: true
  });

  const username = 'ramesh@yopmail.com';
  console.log(`Searching database for user: ${username}...\n`);

  // 1. Get User Profile
  const [users] = await con.query(
    `SELECT user_id, user_name, email, user_mobile, user_type_id, status FROM user_master WHERE email = ?`,
    [username]
  );

  if (users.length === 0) {
    console.log(`❌ No user found with email ${username}`);
    process.exit(1);
  }

  const user = users[0];
  console.log('=== User Profile ===');
  console.log(user);
  console.log();

  // 2. Get Teacher Master Profile
  const [teachers] = await con.query(
    `SELECT teacher_id, first_name, last_name, udise_code, status FROM teacher_master WHERE user_id = ?`,
    [user.user_id]
  );

  if (teachers.length === 0) {
    console.log(`⚠️ User is not mapped to any record in teacher_master.`);
    process.exit(1);
  }

  const teacher = teachers[0];
  console.log('=== Teacher Profile ===');
  console.log(teacher);
  console.log();

  // Get School name
  const [schools] = await con.query(
    `SELECT school_name, region_id FROM school_master WHERE udise_code = ?`,
    [teacher.udise_code]
  );
  if (schools.length > 0) {
    console.log(`School Name: ${schools[0].school_name}`);
    
    const [regions] = await con.query(
      `SELECT region_name FROM region_master WHERE region_id = ?`,
      [schools[0].region_id]
    );
    if (regions.length > 0) {
      console.log(`Region: ${regions[0].region_name}`);
    }
  }
  console.log();

  // 3. Get Grade-Section Mappings
  const [mappings] = await con.query(
    `SELECT id, grade, section FROM teacher_grade_section_mappings WHERE teacher_id = ?`,
    [teacher.teacher_id]
  );

  console.log('=== Class Mappings ===');
  console.log(mappings);
  console.log();

  // 4. Retrieve Mapped Students & OMR Stats
  if (mappings.length > 0) {
    console.log('=== Students & OMR Status Breakdown ===');
    for (const map of mappings) {
      // Find grade record
      let gradeQueryStr = map.grade;
      // Resolve grade numeral if roman
      let gradeNameQuery = map.grade;
      if (map.grade === '3') gradeNameQuery = 'III';
      else if (map.grade === '6') gradeNameQuery = 'VI';
      else if (map.grade === '9') gradeNameQuery = 'IX';

      const [gradeMasterRecs] = await con.query(
        `SELECT grade_id, grade_name FROM grade_master WHERE grade_name = ?`,
        [gradeNameQuery]
      );

      if (gradeMasterRecs.length === 0) {
        console.log(`Grade ${map.grade} not found in grade_master.`);
        continue;
      }
      const gradeId = gradeMasterRecs[0].grade_id;

      // Count students
      const [studentCounts] = await con.query(
        `SELECT COUNT(*) as cnt FROM student_master WHERE udise_code = ? AND grade_id = ? AND section = ? AND status = 1`,
        [teacher.udise_code, gradeId, map.section]
      );
      const totalStudents = studentCounts[0].cnt;

      // Count OMR responses completed
      const [completedCounts] = await con.query(
        `SELECT COUNT(DISTINCT s.student_id) as cnt 
         FROM student_master s 
         JOIN omr_student_response r ON s.student_id = r.student_id
         WHERE s.udise_code = ? AND s.grade_id = ? AND s.section = ? AND s.status = 1`,
        [teacher.udise_code, gradeId, map.section]
      );
      const completedStudents = completedCounts[0].cnt;

      console.log(`Grade: ${map.grade} (${gradeNameQuery}), Section: ${map.section}`);
      console.log(`- Total Assigned Students: ${totalStudents}`);
      console.log(`- Completed OMR submissions: ${completedStudents}`);
      console.log(`- Pending OMR submissions: ${totalStudents - completedStudents}`);
      console.log();
    }
  }

  process.exit(0);
}

run().catch(console.error);
