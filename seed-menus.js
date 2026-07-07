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
    console.log('Clearing existing menus and mappings...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE role_menu_mapping');
    await connection.execute('TRUNCATE TABLE menu_master');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    const menus = [
      // ALL MENUS (We use menu_remarks as the category group string)
      // Dashboard (shared)
      { id: 1, menu_name: 'Dashboard', menu_link: '/', menu_icon: 'Home', menu_remarks: 'OVERVIEW', priority: 1 },
      
      // Admin specific
      { id: 2, menu_name: 'Coordinators', menu_link: '/coordinators', menu_icon: 'Users', menu_remarks: 'COORDINATOR MANAGEMENT', priority: 2 },
      { id: 3, menu_name: 'Students', menu_link: '/students', menu_icon: 'GraduationCap', menu_remarks: 'STUDENT MANAGEMENT', priority: 3 },
      { id: 4, menu_name: 'OMR Entry Status', menu_link: '/omr-entry-status', menu_icon: 'FileCheck', menu_remarks: 'OMR PROCESSING', priority: 4 },
      { id: 5, menu_name: 'OMR Evaluation', menu_link: '/omr-evaluation', menu_icon: 'Settings', menu_remarks: 'OMR PROCESSING', priority: 5 },
      { id: 6, menu_name: 'National Report', menu_link: '/national-report', menu_icon: 'Globe', menu_remarks: 'REPORTS', priority: 6 },
      { id: 7, menu_name: 'Region Report', menu_link: '/region-report', menu_icon: 'MapPin', menu_remarks: 'REPORTS', priority: 7 },
      { id: 8, menu_name: 'School Report', menu_link: '/school-report', menu_icon: 'Building', menu_remarks: 'REPORTS', priority: 8 },
      { id: 14, menu_name: 'Upload OMR Data', menu_link: '/upload', menu_icon: 'UploadCloud', menu_remarks: 'DATA MANAGEMENT', priority: 9 },

      // Coordinator specific
      { id: 9, menu_name: 'Teacher List', menu_link: '/teachers', menu_icon: 'Users', menu_remarks: 'TEACHER MANAGEMENT', priority: 2 },
      { id: 10, menu_name: 'Teacher Allocation', menu_link: '/allocations', menu_icon: 'UserCheck', menu_remarks: 'TEACHER MANAGEMENT', priority: 3 },
      { id: 11, menu_name: 'Student List', menu_link: '/students', menu_icon: 'UserPlus', menu_remarks: 'STUDENT MANAGEMENT', priority: 4 }, // Uses UserPlus in coord
      { id: 12, menu_name: 'Add OMR Result', menu_link: '/omr', menu_icon: 'ClipboardList', menu_remarks: 'STUDENT MANAGEMENT', priority: 5 },
      
      // Teacher specific (Student List & Add OMR Result - same routes as Coordinator)
      // Actually we can reuse 11 and 12 for teacher, but they have different categories maybe? 
      // Coordinator uses MAIN -> TEACHER MANAGEMENT -> STUDENT MANAGEMENT
      // Let's just create generic ones for them.
      { id: 13, menu_name: 'Dashboard', menu_link: '/', menu_icon: 'Home', menu_remarks: 'MAIN', priority: 1 },
    ];

    console.log('Inserting into menu_master...');
    for (const m of menus) {
      await connection.execute(
        `INSERT INTO menu_master (id, menu_name, menu_link, menu_icon, menu_remarks, priority, status, is_parent, sub_menu, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 10)`,
        [m.id, m.menu_name, m.menu_link, m.menu_icon, m.menu_remarks, m.priority]
      );
    }

    console.log('Inserting into role_menu_mapping...');
    // Roles: 1=Superadmin, 2=Admin, 3=Coordinator, 4=Teacher, 5=Student
    const roleMappings = [
      // Admin (Role 1 & 2) - Removed 3 (Students)
      ...[1, 2].flatMap(role => [1, 2, 4, 5, 6, 7, 8, 14].map(menuId => [role, menuId])),
      // Coordinator (Role 3) -> Uses dashboard #13 for 'MAIN' category instead of 'OVERVIEW', plus 9, 10, 11, 12
      ...[3].flatMap(role => [13, 9, 10, 11, 12].map(menuId => [role, menuId])),
      // Teacher (Role 4) -> Dashboard #13, Student List #11, Add OMR Result #12
      ...[4].flatMap(role => [13, 11, 12].map(menuId => [role, menuId]))
    ];

    for (const [roleId, menuId] of roleMappings) {
      await connection.execute(
        `INSERT INTO role_menu_mapping (role_id, menu_id, created_by, status) VALUES (?, ?, 10, 1)`,
        [roleId, menuId]
      );
    }

    console.log('Successfully seeded menus!');
  } catch (err) {
    console.error('Error seeding menus:', err);
  } finally {
    await connection.end();
  }
}

seed();
