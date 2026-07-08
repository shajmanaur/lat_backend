require('dotenv').config();
const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function seedSubjects() {
  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || '192.168.0.131',
    user: process.env.TYPEORM_DB_USERNAME || 'lat_second_user',
    password: process.env.TYPEORM_DB_PASSWORD || 'lat@222',
    database: process.env.TYPEORM_DB_DATABASE || 'lat_second_staging',
  });

  try {
    console.log('Reading Excel file...');
    const filePath = 'C:\\Users\\user\\Downloads\\Data.xlsx';
    const workbook = xlsx.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      console.log(`\nProcessing Sheet: ${sheetName}`);
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

      if (grades.length === 0) {
        console.log(`❌ Grade ${gradeStr} not found in database. Skipping.`);
        continue;
      }
      const gradeId = grades[0].grade_id;

      const subjectsRow = data[0];
      const questionsRow = data[1];

      // Track unique subjects in this sheet
      const uniqueSubjects = new Set();
      
      for (let c = 9; c < subjectsRow.length; c++) {
        const subName = subjectsRow[c];
        const qName = questionsRow[c];
        if (subName && qName && String(subName).trim() !== '') {
          uniqueSubjects.add(String(subName).trim());
        }
      }

      for (const subName of uniqueSubjects) {
        // 1. Check/Insert Subject
        const [existingSubjects] = await connection.execute(
          `SELECT subject_id FROM subject_master WHERE LOWER(subject_name) = ?`,
          [subName.toLowerCase()]
        );

        let subjectId;
        if (existingSubjects.length > 0) {
          subjectId = existingSubjects[0].subject_id;
        } else {
          console.log(`➕ Inserting Subject: ${subName}`);
          const [result] = await connection.execute(
            `INSERT INTO subject_master (subject_name, created_by, status) VALUES (?, 10, 1)`,
            [subName]
          );
          subjectId = result.insertId;
        }

        // 2. Check/Insert Mapping
        const [existingMappings] = await connection.execute(
          `SELECT id FROM subject_grade_mapping WHERE subject_id = ? AND grade_id = ?`,
          [subjectId, gradeId]
        );

        if (existingMappings.length === 0) {
          console.log(`🔗 Mapping Subject '${subName}' to Grade ID ${gradeId}`);
          await connection.execute(
            `INSERT INTO subject_grade_mapping (subject_id, grade_id, status) VALUES (?, ?, 1)`,
            [subjectId, gradeId]
          );
        }
      }
    }
    
    console.log('\n✅ Successfully processed subjects and mappings!');
  } catch (err) {
    console.error('Error seeding subjects:', err);
  } finally {
    await connection.end();
  }
}

seedSubjects();
