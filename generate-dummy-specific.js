require('dotenv').config();
const mysql = require('mysql2/promise');
const xlsx = require('xlsx');
const path = require('path');

async function generate() {
  const connection = await mysql.createConnection({
    host: process.env.TYPEORM_DB_HOST || '192.168.0.131',
    user: process.env.TYPEORM_DB_USERNAME || 'lat_second_user',
    password: process.env.TYPEORM_DB_PASSWORD || 'lat@222',
    database: process.env.TYPEORM_DB_DATABASE || 'lat_second_staging',
  });

  try {
    const udiseCode = '9039100018';
    console.log(`Fetching data for UDISE: ${udiseCode}`);
    
    const [schools] = await connection.query('SELECT * FROM school_master WHERE udise_code = ?', [udiseCode]);
    if (schools.length === 0) throw new Error(`School with UDISE ${udiseCode} not found.`);
    const school = schools[0];
    
    const [regions] = await connection.query('SELECT * FROM region_master WHERE region_id = ?', [school.region_id]);
    const regionName = regions.length > 0 ? regions[0].region_name : 'Dummy Region';

    const [students] = await connection.query('SELECT * FROM student_master WHERE udise_code = ?', [udiseCode]);
    if (students.length === 0) throw new Error(`No students found for UDISE ${udiseCode}.`);

    // Fetch all grades for mapping
    const [grades] = await connection.query('SELECT * FROM grade_master');

    const sourcePath = 'C:\\Users\\user\\Downloads\\Data.xlsx';
    const outputPath = 'C:\\Users\\user\\Downloads\\Dummy_Specific_9039100018_ALL.xlsx';
    const serverOutputPath = path.join(__dirname, 'uploads', 'Dummy_Specific_9039100018_ALL.xlsx');
    
    const workbook = xlsx.readFile(sourcePath);
    const newWorkbook = xlsx.utils.book_new();

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (data.length < 4) continue;
      
      const newSheetData = [data[0], data[1], data[2], data[3]];
      
      // Determine what grade this sheet represents
      let targetGradeIdentifiers = [];
      if (sheetName.includes('Class 3')) targetGradeIdentifiers = ['3', 'III'];
      if (sheetName.includes('Class 6')) targetGradeIdentifiers = ['6', 'VI'];
      if (sheetName.includes('Class 9')) targetGradeIdentifiers = ['9', 'IX'];

      // Find all students for this specific sheet's grade
      const sheetStudents = students.filter(stu => {
        const grade = grades.find(g => g.grade_id === stu.grade_id);
        if (!grade) return false;
        return targetGradeIdentifiers.some(identifier => 
          String(grade.grade_name).toUpperCase().includes(identifier) || 
          String(grade.grade_name) === identifier
        );
      });

      console.log(`Sheet: ${sheetName} -> Found ${sheetStudents.length} students`);

      for (const student of sheetStudents) {
        // Insert specific student
        const row = new Array(data[3].length).fill('');
        row[0] = regionName;
        row[1] = udiseCode;
        row[2] = school.school_name;
        row[3] = student.apaar_id || `987${Math.floor(Math.random() * 90000000)}`;
        row[4] = student.full_name;
        row[5] = student.gender === 'f' ? 'Female' : student.gender === 'm' ? 'Male' : 'Other';
        row[6] = student.section || 'A';
        row[7] = 'Present';
        row[8] = 'Completed'; // Status

        const options = ['A', 'B', 'C', 'D'];
        for (let c = 9; c < data[0].length; c++) {
          if (data[0][c] && data[1][c]) {
            row[c] = options[Math.floor(Math.random() * options.length)];
          }
        }
        newSheetData.push(row);
      }
      
      const newSheet = xlsx.utils.aoa_to_sheet(newSheetData);
      xlsx.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
    }

    xlsx.writeFile(newWorkbook, outputPath);
    xlsx.writeFile(newWorkbook, serverOutputPath);
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`✅ Also available at: http://localhost:5001/Dummy_Specific_9039100018_ALL.xlsx`);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

generate();
