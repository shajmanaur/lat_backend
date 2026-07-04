const ExcelJS = require('exceljs');
const mysql = require('mysql2/promise');

async function importSchools() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'lat_new'
  });

  console.log('Connected to DB');

  // Fetch all regions and map them: name -> id
  const [rows] = await connection.execute('SELECT region_id, region_name FROM region_master');
  const regionMap = {};
  rows.forEach(row => {
    // Upper case it to be safe
    regionMap[row.region_name.toUpperCase().trim()] = row.region_id;
  });
  
  // Handle Bangalore / Bengaluru edge case
  if (regionMap['BENGALURU']) {
    regionMap['BANGALORE'] = regionMap['BENGALURU'];
  }
  
  console.log(`Loaded ${Object.keys(regionMap).length} regions for mapping.`);

  // Load excel file
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\user\\Downloads\\school_master.xlsx');
  const worksheet = workbook.worksheets[0];
  
  const headerRow = worksheet.getRow(1);
  let udiseCol = -1, regionCol = -1, nameCol = -1;
  
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value.toString().toUpperCase().trim();
    if (val === 'UDISE CODE') udiseCol = colNumber;
    if (val === 'REGION NAME') regionCol = colNumber;
    if (val === 'SCHOOL NAME') nameCol = colNumber;
  });

  if (udiseCol === -1 || regionCol === -1 || nameCol === -1) {
    console.error('Could not find required columns!');
    process.exit(1);
  }

  const schoolsToInsert = [];
  let skipped = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const udise = row.getCell(udiseCol).value;
    const regionNameRaw = row.getCell(regionCol).value;
    const schoolName = row.getCell(nameCol).value;
    
    if (!udise || !regionNameRaw || !schoolName) return;

    const regionName = regionNameRaw.toString().toUpperCase().trim();
    const regionId = regionMap[regionName];
    
    if (!regionId) {
      console.warn(`Row ${rowNumber}: Region not found for name "${regionName}"`);
      skipped++;
      return;
    }
    
    schoolsToInsert.push([
      udise.toString().trim(),
      schoolName.toString().trim(),
      regionId
    ]);
  });

  console.log(`Parsed ${schoolsToInsert.length} schools to insert. Skipped ${skipped}.`);

  if (schoolsToInsert.length > 0) {
    const batchSize = 1000;
    for (let i = 0; i < schoolsToInsert.length; i += batchSize) {
      const batch = schoolsToInsert.slice(i, i + batchSize);
      const query = 'INSERT INTO school_master (udise_code, school_name, region_id) VALUES ?';
      await connection.query(query, [batch]);
      console.log(`Inserted batch ${i} to ${i + batch.length}`);
    }
  }

  console.log('Import completed successfully!');
  await connection.end();
}

importSchools().catch(err => {
  console.error(err);
  process.exit(1);
});
