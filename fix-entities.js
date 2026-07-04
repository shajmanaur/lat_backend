const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/entities');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.ts')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace bit default 1
  content = content.replace(/type: 'bit', default: 1/g, "type: 'boolean', default: true");
  
  // Replace bit nullable true
  content = content.replace(/type: 'bit', nullable: true/g, "type: 'boolean', nullable: true");
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
