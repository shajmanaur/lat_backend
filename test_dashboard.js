require('dotenv').config();
const { DataSource } = require('typeorm');
const { StudentMaster } = require('./src/entities/student-master.entity');
const { TeacherMaster } = require('./src/entities/teacher-master.entity');
const { UserMaster } = require('./src/entities/user-master.entity');
const { OmrStudentResponse } = require('./src/entities/omr-student-response.entity');
const { SchoolMaster } = require('./src/entities/school-master.entity');
const { RegionMaster } = require('./src/entities/region-master.entity');
const { GradeMaster } = require('./src/entities/grade-master.entity');
const { UserTypeMaster } = require('./src/entities/user-type-master.entity');
const { OmrQuestionMaster } = require('./src/entities/omr-question-master.entity');
const { DashboardService } = require('./dist/src/modules/dashboard/dashboard.service');

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.TYPEORM_DB_HOST,
    port: parseInt(process.env.TYPEORM_DB_PORT || '3306'),
    username: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE,
    entities: [StudentMaster, TeacherMaster, UserMaster, OmrStudentResponse, SchoolMaster, RegionMaster, GradeMaster, UserTypeMaster, OmrQuestionMaster],
    synchronize: false,
  });

  await dataSource.initialize();
  
  const ds = new DashboardService(
    dataSource.getRepository(StudentMaster),
    dataSource.getRepository(TeacherMaster),
    dataSource.getRepository(UserMaster),
    dataSource.getRepository(OmrStudentResponse),
    dataSource
  );

  try {
    const res = await ds.getOverviewStats(2, 2, {}); // userId=2, roleId=2 (Admin)
    console.log(res);
  } catch(e) {
    console.error("ERROR:", e);
  }
  
  await dataSource.destroy();
}

run();
