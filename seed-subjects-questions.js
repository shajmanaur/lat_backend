require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || '192.168.0.131',
    user: process.env.TYPEORM_DB_USERNAME || 'lat_second_user',
    password: process.env.TYPEORM_DB_PASSWORD || 'lat@222',
    database: process.env.TYPEORM_DB_DATABASE || 'lat_second_staging',
  });

  try {
    console.log('Disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 1. GRADE MASTER
    console.log('Truncating grade_master and inserting grades III, VI, IX...');
    await connection.execute('TRUNCATE TABLE grade_master');
    const grades = [
      { id: 1, name: 'III', priority: 1 },
      { id: 2, name: 'VI', priority: 2 },
      { id: 3, name: 'IX', priority: 3 },
    ];
    for (const g of grades) {
      await connection.execute(
        `INSERT INTO grade_master (grade_id, grade_name, priority, status, created_by) VALUES (?, ?, ?, 1, 1)`,
        [g.id, g.name, g.priority]
      );
    }
    console.log('Inserted grades.');

    // 2. SUBJECT MASTER
    console.log('Truncating subject_master and inserting KV subjects...');
    await connection.execute('TRUNCATE TABLE subject_master');
    const subjects = [
      { id: 1, name: 'English', priority: 1 },
      { id: 2, name: 'Hindi', priority: 2 },
      { id: 3, name: 'Mathematics', priority: 3 },
      { id: 4, name: 'Science', priority: 4 },
      { id: 5, name: 'Social Science', priority: 5 },
    ];
    for (const s of subjects) {
      await connection.execute(
        `INSERT INTO subject_master (subject_id, subject_name, priority, status, created_by) VALUES (?, ?, ?, 1, 1)`,
        [s.id, s.name, s.priority]
      );
    }
    console.log('Inserted subjects.');

    // 3. OMR QUESTION MASTER
    console.log('Truncating omr_question_master and inserting dummy questions...');
    await connection.execute('TRUNCATE TABLE omr_question_master');
    
    let questionId = 1;
    const options = ['A', 'B', 'C', 'D'];
    
    // Grade III: 45 questions
    // Grade VI: 51 questions
    // Grade IX: 60 questions
    const gradeConfigs = [
      { gradeId: 1, count: 45 },
      { gradeId: 2, count: 51 },
      { gradeId: 3, count: 60 }
    ];

    for (const config of gradeConfigs) {
      for (let i = 1; i <= config.count; i++) {
        const subjectId = subjects[i % subjects.length].id; // Assign random subject iteratively
        const correctOption = options[i % options.length];
        
        await connection.execute(
          `INSERT INTO omr_question_master 
           (id, grade_id, subject_id, item_number, ncf_competency, competency_code, correct_option, status, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [
            questionId, 
            config.gradeId, 
            subjectId, 
            i, 
            `NCF Dummy Competency ${questionId}`, 
            `COMP-${questionId}`, 
            correctOption
          ]
        );
        questionId++;
      }
    }
    console.log('Inserted dummy OMR questions.');

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Successfully seeded grades, subjects, and questions!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await connection.end();
  }
}

seed();
