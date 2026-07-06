const mysql = require('mysql2/promise');

async function run() {
  const con = await mysql.createConnection({
    host: '192.168.0.131',
    user: 'lat_second_user',
    password: 'lat@222',
    database: 'lat_second_staging'
  });

  try {
    // 1. Find the coordinator
    const [coordinators] = await con.execute('SELECT user_id FROM user_master WHERE email = ? AND role_id = 3', ['shad@yopmail.com']);
    if (coordinators.length === 0) {
      console.log('Coordinator shad@yopmail.com not found!');
      return;
    }
    const coordinatorId = coordinators[0].user_id;
    console.log(`Found Coordinator ID: ${coordinatorId}`);

    // Get a valid school/udise_code
    const [schools] = await con.execute('SELECT udise_code, region_id FROM school_master LIMIT 1');
    if (schools.length === 0) {
      console.log('No schools found in school_master. Please add one first.');
      return;
    }
    const udiseCode = schools[0].udise_code;
    const regionId = schools[0].region_id;
    console.log(`Using UDISE Code: ${udiseCode} (Region: ${regionId})`);

    // 2. Create 4 Teachers
    const teacherIds = [];
    for (let i = 1; i <= 4; i++) {
      const email = `mock_teacher_${Date.now()}_${i}@test.com`;
      // Insert into user_master
      const [userRes] = await con.execute(`
        INSERT INTO user_master (user_name, email, password, role_id, status, created_by, created_at) 
        VALUES (?, ?, ?, 4, '1', ?, NOW())
      `, [`Teacher_${Date.now()}_${i}`, email, 'password123', coordinatorId]);
      
      const teacherUserId = userRes.insertId;
      teacherIds.push(teacherUserId);

      // Insert into teacher_master
      await con.execute(`
        INSERT INTO teacher_master (user_id, first_name, last_name, udise_code, region_id, email_id, status, created_by, created_date)
        VALUES (?, ?, ?, ?, ?, ?, '1', ?, NOW())
      `, [teacherUserId, `Teacher`, `${i}`, udiseCode, regionId, email, coordinatorId]);
    }
    console.log(`Created 4 Teachers: ${teacherIds.join(', ')}`);

    // 3. Create 10 Students (grades 3, 6, 9)
    const studentIds = [];
    const grades = [3, 3, 3, 6, 6, 6, 9, 9, 9, 9];
    for (let i = 0; i < 10; i++) {
      const [stuRes] = await con.execute(`
        INSERT INTO student_master (full_name, roll_num, grade, section, udise_code, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, NOW())
      `, [`Mock Student ${i+1}`, Date.now() % 1000000 + i, grades[i].toString(), 'A', udiseCode, coordinatorId]);
      
      studentIds.push(stuRes.insertId);
    }
    console.log(`Created 10 Students in grades 3, 6, 9: ${studentIds.join(', ')}`);

    // 4. Create OMR Responses for 2 students mapped to a teacher
    const selectedStudents = [studentIds[0], studentIds[1]];
    const mappedTeacher = teacherIds[0];

    for (const studentId of selectedStudents) {
      await con.execute(`
        INSERT INTO omr_student_response (student_id, teacher_id, question_id, selected_option, is_correct, status, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [studentId, mappedTeacher, 1, 'A', true, 1, mappedTeacher]); // Evaluated
    }
    console.log(`Created OMR entries for 2 students (IDs: ${selectedStudents.join(', ')}) mapped to Teacher ID ${mappedTeacher}`);

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await con.end();
  }
}

run();
