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

  // We saw teacher user_id=24 maps to teacher_id=16, who is mapped to Grade 3 (grade_id=1, name='III') and sections A, B
  const teacherUserId = 24;

  try {
    console.log("=== 1. Test getTeacherOmrSummary ===");
    const summary = await omrService.getTeacherOmrSummary(teacherUserId);
    console.log("Summary:", JSON.stringify(summary, null, 2));

    console.log("\n=== 2. Test getTeacherOmrGrades ===");
    const grades = await omrService.getTeacherOmrGrades(teacherUserId);
    console.log("Grades:", JSON.stringify(grades, null, 2));

    console.log("\n=== 3. Test getTeacherOmrStudents for Grade 3 (grade_id=1) ===");
    const studentsRes = await omrService.getTeacherOmrStudents(teacherUserId, 1);
    console.log("Students count:", studentsRes.students.length);
    console.log("Students summary:", studentsRes.summary);
    if (studentsRes.students.length > 0) {
      console.log("Sample student:", studentsRes.students[0]);
    }

    console.log("\n=== 4. Test validateTeacherAccessToStudent ===");
    if (studentsRes.students.length > 0) {
      const studentId = studentsRes.students[0].student_id;
      console.log(`Checking access for studentId: ${studentId}`);
      await omrService.validateTeacherAccessToStudent(teacherUserId, studentId);
      console.log("Access validation PASSED (expected)");

      console.log("Checking access for non-existent studentId: 9999");
      try {
        await omrService.validateTeacherAccessToStudent(teacherUserId, 9999);
        console.error("Access validation FAILED (should have thrown)");
      } catch (err) {
        console.log("Access validation PASSED - caught expected error:", err.message);
      }
    }

  } catch(e) {
    console.error("TEST FAILED WITH ERROR:", e);
  }
  
  await dataSource.destroy();
}

run();
