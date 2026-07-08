require('dotenv').config();
const { DataSource } = require('typeorm');
const { StudentMaster } = require('./dist/src/entities/student-master.entity');
const { TeacherMaster } = require('./dist/src/entities/teacher-master.entity');
const { UserMaster } = require('./dist/src/entities/user-master.entity');
const { OmrStudentResponse } = require('./dist/src/entities/omr-student-response.entity');
const { OmrQuestionMaster } = require('./dist/src/entities/omr-question-master.entity');
const { GradeMaster } = require('./dist/src/entities/grade-master.entity');
const { TeacherGradeSectionMapping } = require('./dist/src/entities/teacher-grade-section-mapping.entity');
const { AssessmentMaster } = require('./dist/src/entities/assessment-master.entity');
const { SchoolMaster } = require('./dist/src/entities/school-master.entity');
const { RegionMaster } = require('./dist/src/entities/region-master.entity');
const { SubjectMaster } = require('./dist/src/entities/subject-master.entity');
const { UserTypeMaster } = require('./dist/src/entities/user-type-master.entity');

const { OmrService } = require('./dist/src/modules/omr/omr.service');
const { DashboardService } = require('./dist/src/modules/dashboard/dashboard.service');
const { StudentsService } = require('./dist/src/modules/students/students.service');

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.TYPEORM_DB_HOST,
    port: parseInt(process.env.TYPEORM_DB_PORT || '3306'),
    username: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_DATABASE,
    entities: [
      StudentMaster,
      TeacherMaster,
      UserMaster,
      OmrStudentResponse,
      OmrQuestionMaster,
      GradeMaster,
      TeacherGradeSectionMapping,
      AssessmentMaster,
      SchoolMaster,
      RegionMaster,
      SubjectMaster,
      UserTypeMaster
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  
  const omrService = new OmrService(
    dataSource.getRepository(OmrQuestionMaster),
    dataSource.getRepository(OmrStudentResponse),
    dataSource.getRepository(StudentMaster),
    dataSource.getRepository(TeacherMaster),
    dataSource.getRepository(GradeMaster),
    dataSource.getRepository(TeacherGradeSectionMapping),
    dataSource.getRepository(AssessmentMaster)
  );

  const dashboardService = new DashboardService(
    dataSource.getRepository(StudentMaster),
    dataSource.getRepository(TeacherMaster),
    dataSource.getRepository(UserMaster),
    dataSource.getRepository(OmrStudentResponse),
    dataSource
  );

  const studentsService = new StudentsService(
    dataSource.getRepository(StudentMaster),
    dataSource.getRepository(TeacherMaster)
  );

  const teacherUserId = 24;

  console.log('#################################################################');
  console.log('1. GET http://localhost:5001/api/v1/dashboard/stats');
  console.log('#################################################################');
  try {
    const stats = await dashboardService.getOverviewStats(teacherUserId, 4);
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error(err);
  }
  console.log('\n');

  console.log('#################################################################');
  console.log('2. GET http://localhost:5001/api/v1/students?page=1&limit=10');
  console.log('#################################################################');
  try {
    const result = await studentsService.findAll(1, 10, teacherUserId, 4);
    const apiResult = {
      status: 'success',
      data: result.data,
      meta: {
        total: result.total,
        page: 1,
        limit: 10
      }
    };
    console.log(JSON.stringify(apiResult, null, 2));
  } catch (err) {
    console.error(err);
  }
  console.log('\n');

  console.log('#################################################################');
  console.log('3. GET http://localhost:5001/omr/teacher/summary');
  console.log('#################################################################');
  try {
    const summary = await omrService.getTeacherOmrSummary(teacherUserId);
    const apiResult = {
      status: 'success',
      data: summary
    };
    console.log(JSON.stringify(apiResult, null, 2));
  } catch (err) {
    console.error(err);
  }
  console.log('\n');

  console.log('#################################################################');
  console.log('4. GET http://localhost:5001/omr/teacher/grades');
  console.log('#################################################################');
  try {
    const grades = await omrService.getTeacherOmrGrades(teacherUserId);
    const apiResult = {
      status: 'success',
      data: grades
    };
    console.log(JSON.stringify(apiResult, null, 2));
  } catch (err) {
    console.error(err);
  }
  console.log('\n');

  console.log('#################################################################');
  console.log('5. GET http://localhost:5001/omr/teacher/grades/1/students?section=A');
  console.log('#################################################################');
  try {
    const studentsRes = await omrService.getTeacherOmrStudents(teacherUserId, 1, 'A');
    const apiResult = {
      status: 'success',
      data: studentsRes
    };
    console.log(JSON.stringify(apiResult, null, 2));
  } catch (err) {
    console.error(err);
  }
  console.log('\n');

  await dataSource.destroy();
}

run().catch(console.error);
