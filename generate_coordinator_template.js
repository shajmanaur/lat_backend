const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const outputPath = path.join(uploadsDir, 'Coordinator_Template.xlsx');

const workbook = xlsx.utils.book_new();

const templateData = [
  ['Name', 'Email', 'Mobile'],
  ['John Doe', 'john.doe@example.com', '9876543210'],
  ['Jane Smith', 'jane.smith@example.com', '8765432109']
];

const worksheet = xlsx.utils.aoa_to_sheet(templateData);

// Set column widths
worksheet['!cols'] = [
  { wch: 25 },
  { wch: 35 },
  { wch: 15 }
];

xlsx.utils.book_append_sheet(workbook, worksheet, 'Coordinators');

xlsx.writeFile(workbook, outputPath);
console.log('✅ Generated Coordinator_Template.xlsx in uploads directory');
