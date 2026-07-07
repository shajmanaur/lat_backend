import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as xlsx from 'xlsx';
import { SchoolMaster } from '../../entities/school-master.entity';
import { RegionMaster } from '../../entities/region-master.entity';
import { StudentMaster } from '../../entities/student-master.entity';
import { SubjectMaster } from '../../entities/subject-master.entity';
import { GradeMaster } from '../../entities/grade-master.entity';
import { OmrQuestionMaster } from '../../entities/omr-question-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { SubjectGradeMapping } from '../../entities/subject-grade-mapping.entity';

@Injectable()
export class OmrUploadService {
  constructor(private dataSource: DataSource) {}

  async processUpload(file: Express.Multer.File, userId: number) {
    if (!file) throw new BadRequestException('No file uploaded');

    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetsToProcess = workbook.SheetNames;

    // Phase 1: Validation
    for (const sheetName of sheetsToProcess) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        const entryStatus = row[8];
        if (entryStatus && String(entryStatus).trim().toLowerCase() === 'pending') {
          throw new BadRequestException(`Validation Error: Found 'Pending' entry status in sheet '${sheetName}', row ${i + 1}. Upload aborted.`);
        }
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const regionRepo = queryRunner.manager.getRepository(RegionMaster);
      const schoolRepo = queryRunner.manager.getRepository(SchoolMaster);
      const gradeRepo = queryRunner.manager.getRepository(GradeMaster);
      const subjectRepo = queryRunner.manager.getRepository(SubjectMaster);
      const studentRepo = queryRunner.manager.getRepository(StudentMaster);
      const mappingRepo = queryRunner.manager.getRepository(SubjectGradeMapping);
      const questionRepo = queryRunner.manager.getRepository(OmrQuestionMaster);
      const responseRepo = queryRunner.manager.getRepository(OmrStudentResponse);

      // Cache lookups
      const allRegions = await regionRepo.find();
      const allGrades = await gradeRepo.find();
      const allSubjects = await subjectRepo.find();
      const allQuestions = await questionRepo.find();

      for (const sheetName of sheetsToProcess) {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (data.length <= 4) continue;

        // Determine Grade
        let gradeStr = '3';
        const match = sheetName.match(/Class (\d+)/i);
        if (match) {
          gradeStr = match[1];
        } else if (data[2] && data[2][0]) {
          const titleMatch = String(data[2][0]).match(/Grade (\d+)/i);
          if (titleMatch) gradeStr = titleMatch[1];
        }

        const grade = allGrades.find(g => 
          g.grade_name.toLowerCase() === gradeStr.toLowerCase() || 
          g.grade_name.toLowerCase() === `grade ${gradeStr}` ||
          (gradeStr === '3' && g.grade_name.toLowerCase() === 'iii') ||
          (gradeStr === '6' && g.grade_name.toLowerCase() === 'vi') ||
          (gradeStr === '9' && g.grade_name.toLowerCase() === 'ix')
        );

        if (!grade) {
          throw new BadRequestException(`Grade mapping not found for sheet ${sheetName}`);
        }

        // Process Subjects from Row 0
        const subjectsRow = data[0];
        const questionsRow = data[1];
        const colMapping: { colIdx: number, subject_id: number, item_number: number }[] = [];

        for (let c = 9; c < subjectsRow.length; c++) {
          const subName = subjectsRow[c];
          const qName = questionsRow[c];
          if (subName && qName) {
            let subject = allSubjects.find(s => s.subject_name.toLowerCase() === String(subName).toLowerCase());
            if (!subject) {
              subject = subjectRepo.create({ subject_name: String(subName), created_by: userId, status: true });
              await subjectRepo.save(subject);
              allSubjects.push(subject);
            }

            // Ensure subject_grade_mapping
            const existingMap = await mappingRepo.findOne({ where: { subject_id: subject.subject_id, grade_id: grade.grade_id } });
            if (!existingMap) {
              await mappingRepo.save(mappingRepo.create({ subject_id: subject.subject_id, grade_id: grade.grade_id }));
            }

            const qMatch = String(qName).match(/Question (\d+)/i);
            if (qMatch) {
              colMapping.push({ colIdx: c, subject_id: subject.subject_id, item_number: parseInt(qMatch[1]) });
            }
          }
        }

        // Process Students (Row 4+)
        for (let r = 4; r < data.length; r++) {
          const row = data[r];
          if (!row || !row[0]) continue; // Skip empty
          
          const regionName = String(row[0]).trim();
          const udiseCode = String(row[1]).trim();
          const schoolName = String(row[2]).trim();
          const apaarId = row[3] ? String(row[3]).trim() : null;
          const studentName = String(row[4]).trim();
          const genderRaw = String(row[5]).trim().toLowerCase();
          const section = String(row[6]).trim();

          // Region
          let region = allRegions.find(rg => rg.region_name.toLowerCase() === regionName.toLowerCase());
          if (!region) {
            region = regionRepo.create({ region_name: regionName, created_by: String(userId) });
            await regionRepo.save(region);
            allRegions.push(region);
          }

          // School
          let school = await schoolRepo.findOne({ where: { udise_code: udiseCode } });
          if (!school) {
            school = schoolRepo.create({ udise_code: udiseCode, school_name: schoolName, region_id: region.region_id });
            await schoolRepo.save(school);
          }

          // Student
          let student = await studentRepo.findOne({ where: { udise_code: udiseCode, grade_id: grade.grade_id, section, full_name: studentName } });
          if (!student) {
            const [lastStudent] = await studentRepo.find({ order: { roll_num: 'DESC' }, take: 1 });
            const roll_num = lastStudent ? lastStudent.roll_num + 1 : 1;
            
            student = studentRepo.create({
              full_name: studentName,
              apaar_id: apaarId,
              udise_code: udiseCode,
              grade_id: grade.grade_id,
              section,
              gender: genderRaw === 'female' ? 'f' : genderRaw === 'male' ? 'm' : 'o',
              roll_num,
              created_by: userId,
              status: true
            });
            await studentRepo.save(student);
          }

          // Duplicate Submission Check
          const existingResponsesCount = await responseRepo.count({ where: { student_id: student.student_id } });
          if (existingResponsesCount > 0) {
            throw new BadRequestException(`Duplicate Submission Blocked: Student '${student.full_name}' (UDISE: ${udiseCode}, Grade: ${grade.grade_name}) already has OMR responses in the system. The entire upload has been aborted to prevent overwriting data.`);
          }

          // Responses
          for (const mapping of colMapping) {
            const cellValue = row[mapping.colIdx];
            if (cellValue && String(cellValue).trim() !== 'Select Option') {
              const selectedOption = String(cellValue).trim();
              
              // Find Question ID
              const question = allQuestions.find(q => q.subject_id === mapping.subject_id && q.grade_id === grade.grade_id && q.item_number === mapping.item_number);
              if (question) {
                const is_correct = selectedOption === question.correct_option ? 1 : 0;
                
                const response = responseRepo.create({
                  student_id: student.student_id,
                  question_id: question.id,
                  selected_option: selectedOption,
                  is_correct,
                  status: 1, // Assume completed if we have an option
                  created_by: userId,
                  updated_by: userId
                });
                await responseRepo.save(response);
              }
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Upload processed successfully.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
