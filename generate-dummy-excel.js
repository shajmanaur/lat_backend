const xlsx = require('xlsx');
const path = require('path');

function generateDummyExcel(outputFilename, udisePrefix) {
  const sourcePath = 'C:\\Users\\user\\Downloads\\Data.xlsx';
  const outputPath = path.join('C:\\Users\\user\\Downloads', outputFilename);
  
  console.log(`Reading source template: ${sourcePath}`);
  const workbook = xlsx.readFile(sourcePath);
  const newWorkbook = xlsx.utils.book_new();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 4) continue;

    // Keep the first 4 header rows (0, 1, 2, 3)
    const newSheetData = [data[0], data[1], data[2], data[3]];
    
    // Generate 5 dummy students per sheet
    for (let i = 1; i <= 5; i++) {
      const dummyRow = new Array(data[3].length).fill('');
      
      dummyRow[0] = 'Dummy Region'; // Region Name
      dummyRow[1] = `${udisePrefix}${i}`; // UDISE Code
      dummyRow[2] = `Dummy School ${udisePrefix}`; // School Name
      dummyRow[3] = `1000${Math.floor(Math.random() * 900000)}`; // APAAR ID
      dummyRow[4] = `Student ${udisePrefix} ${i}`; // Student Name
      dummyRow[5] = i % 2 === 0 ? 'Female' : 'Male'; // Gender
      dummyRow[6] = 'A'; // Section
      dummyRow[7] = 'Present'; // Attendance
      dummyRow[8] = 'Completed'; // Entry Status (Important: must NOT be Pending)

      // Random options for questions
      const options = ['A', 'B', 'C', 'D'];
      for (let c = 9; c < data[0].length; c++) {
        // Only fill if there's a subject and question header
        if (data[0][c] && data[1][c]) {
          dummyRow[c] = options[Math.floor(Math.random() * options.length)];
        }
      }
      
      newSheetData.push(dummyRow);
    }

    const newSheet = xlsx.utils.aoa_to_sheet(newSheetData);
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
  }

  xlsx.writeFile(newWorkbook, outputPath);
  console.log(`✅ Generated: ${outputPath}`);
}

try {
  generateDummyExcel('Dummy_Data_1.xlsx', 'DUMMYA');
  generateDummyExcel('Dummy_Data_2.xlsx', 'DUMMYB');
} catch (err) {
  console.error('Error generating dummy excel files:', err);
}
