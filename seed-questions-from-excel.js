require('dotenv').config();
const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function seedQuestions() {
  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || '192.168.0.131',
    user: process.env.TYPEORM_DB_USERNAME || 'lat_second_user',
    password: process.env.TYPEORM_DB_PASSWORD || 'lat@222',
    database: process.env.TYPEORM_DB_DATABASE || 'lat_second_staging',
  });

  try {
    console.log('Clearing old omr_question_master data...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    // First clear old student responses because they reference question_id
    await connection.execute('TRUNCATE TABLE omr_student_response');
    await connection.execute('TRUNCATE TABLE omr_question_master');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Reading Excel file...');
    const filePath = 'C:\\Users\\user\\Downloads\\Data.xlsx';
    const workbook = xlsx.readFile(filePath);

    let totalQuestionsInserted = 0;

    for (const sheetName of workbook.SheetNames) {
      console.log(`\nProcessing Sheet for Questions: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 3) continue;

      // Determine Grade
      let gradeStr = '3';
      const match = sheetName.match(/Class (\d+)/i);
      if (match) {
        gradeStr = match[1];
      }

      const [grades] = await connection.execute(
        `SELECT grade_id, grade_name FROM grade_master WHERE grade_name LIKE ? OR grade_name LIKE ?`,
        [`%${gradeStr}%`, gradeStr === '3' ? 'III' : gradeStr === '6' ? 'VI' : 'IX']
      );

      if (grades.length === 0) continue;
      const gradeId = grades[0].grade_id;

      const subjectsRow = data[0];
      const questionsRow = data[1];

      for (let c = 9; c < subjectsRow.length; c++) {
        const subName = subjectsRow[c];
        const qName = questionsRow[c];
        
        if (subName && qName && String(subName).trim() !== '') {
          const qMatch = String(qName).match(/Question (\d+)/i);
          if (qMatch) {
            const itemNumber = parseInt(qMatch[1]);
            
            // Get Subject ID
            const [existingSubjects] = await connection.execute(
              `SELECT subject_id FROM subject_master WHERE LOWER(subject_name) = ?`,
              [String(subName).trim().toLowerCase()]
            );

            if (existingSubjects.length > 0) {
              const subjectId = existingSubjects[0].subject_id;
              
              // We'll set a random correct option (A, B, C, or D) for dummy purposes
              const options = ['A', 'B', 'C', 'D'];
              const correctOption = options[Math.floor(Math.random() * options.length)];
              
              await connection.execute(
                `INSERT INTO omr_question_master (grade_id, subject_id, item_number, correct_option, ncf_competency, competency_code, status, created_by) 
                 VALUES (?, ?, ?, ?, 'Dummy Competency', 'C-100', 1, 10)`,
                [gradeId, subjectId, itemNumber, correctOption]
              );
              totalQuestionsInserted++;
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Successfully inserted ${totalQuestionsInserted} questions into omr_question_master matching the Excel structure!`);
  } catch (err) {
    console.error('Error seeding questions:', err);
  } finally {
    await connection.end();
  }
}

seedQuestions();
