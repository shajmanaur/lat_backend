import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OmrQuestionMaster } from '../../entities/omr-question-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { GradeMaster } from '../../entities/grade-master.entity';
import { TeacherGradeSectionMapping } from '../../entities/teacher-grade-section-mapping.entity';
import { AssessmentMaster } from '../../entities/assessment-master.entity';

@Injectable()
export class OmrService {
  constructor(
    @InjectRepository(OmrQuestionMaster)
    private readonly questionRepo: Repository<OmrQuestionMaster>,
    @InjectRepository(OmrStudentResponse)
    private readonly responseRepo: Repository<OmrStudentResponse>,
    @InjectRepository(StudentMaster)
    private readonly studentRepo: Repository<StudentMaster>,
    @InjectRepository(TeacherMaster)
    private readonly teacherRepo: Repository<TeacherMaster>,
    @InjectRepository(GradeMaster)
    private readonly gradeRepo: Repository<GradeMaster>,
    @InjectRepository(TeacherGradeSectionMapping)
    private readonly mappingRepo: Repository<TeacherGradeSectionMapping>,
    @InjectRepository(AssessmentMaster)
    private readonly assessmentRepo: Repository<AssessmentMaster>,
  ) { }

  async getAssessments() {
    return await this.assessmentRepo.find({ where: { status: 1 } });
  }

  async getStudentsForCoordinator(userId: number, roleId?: number) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      return [];
    }

    // Determine where conditions based on role
    let whereCondition: any = { udise_code: teacher.udise_code, status: true };

    if (roleId === 4) {
      // It's a teacher, filter by allocations
      const mappings = await this.mappingRepo.find({ where: { teacher_id: String(userId) } });
      if (mappings.length === 0) {
        return []; // No allocated classes
      }

      const gradesList = await this.gradeRepo.find();
      const getGradeId = (name: string) => {
        const found = gradesList.find(g => g.grade_name.toLowerCase() === name.toLowerCase() || g.grade_name.toLowerCase() === `grade ${name.toLowerCase()}`);
        return found ? found.grade_id : null;
      };

      whereCondition = mappings.map(m => ({
        udise_code: teacher.udise_code,
        status: true,
        grade_id: getGradeId(m.grade),
        section: m.section
      }));
    }

    // Fetch students
    const students = await this.studentRepo.find({
      where: whereCondition,
      relations: ['grade'],
      order: { section: 'ASC', full_name: 'ASC' }
    });

    // Fetch latest response status for each student
    const studentIds = students.map(s => s.student_id);
    let responses: any[] = [];
    if (studentIds.length > 0) {
      // Get the highest status (1 = submitted, 0 = draft)
      responses = await this.responseRepo
        .createQueryBuilder('resp')
        .select('resp.student_id', 'student_id')
        .addSelect('MAX(resp.status)', 'status')
        .addSelect('MAX(resp.updated_at)', 'lastSaved')
        .where('resp.student_id IN (:...studentIds)', { studentIds })
        .groupBy('resp.student_id')
        .getRawMany();
    }

    const responseMap = new Map();
    responses.forEach(r => responseMap.set(Number(r.student_id), r));

    return students.map(s => {
      const respInfo = responseMap.get(Number(s.student_id));
      let omrStatus = 'Pending';
      if (respInfo) {
        omrStatus = respInfo.status === 1 ? 'Completed' : 'In Progress';
      }
      return {
        ...s,
        omr_status: omrStatus,
        last_saved: respInfo?.lastSaved || null
      };
    });
  }

  async getQuestionsForStudent(studentId: number) {
    const student = await this.studentRepo.findOne({ where: { student_id: studentId } });
    if (!student) throw new BadRequestException('Student not found');

    if (!student.grade_id) {
      return [];
    }

    // Usually we also match by subject, but assuming 1 subject for LAT right now based on UI
    return this.questionRepo.find({
      where: { grade_id: student.grade_id, status: 1 },
      order: { item_number: 'ASC' }
    });
  }

  async getStudentResponses(studentId: number) {
    return this.responseRepo.find({
      where: { student_id: studentId },
      order: { question_id: 'ASC' }
    });
  }

  async getQuestionsByGradeAndSubject(grade: string, subject: string) {
    return this.questionRepo.find({
      where: { grade_id: Number(grade), subject_id: Number(subject), status: 1 },
      order: { item_number: 'ASC' }
    });
  }

  async saveStudentResponses(payload: {
    student_id: number;
    responses: { question_id: number; selected_option: string }[];
    status: number; // 0 for draft, 1 for submitted
  }, userId: string | number) {
    const { student_id, responses, status } = payload;

    // Fetch all relevant question metadata to determine correctness
    const questionIds = responses.map(r => r.question_id);
    if (questionIds.length === 0) return { message: 'No responses provided' };

    const questions = await this.questionRepo.findByIds(questionIds);
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Prepare entities for saving
    const responseEntities: OmrStudentResponse[] = responses.map(resp => {
      const question = questionMap.get(resp.question_id);
      if (!question) {
        throw new BadRequestException(`Question ID ${resp.question_id} not found`);
      }

      const is_correct = (resp.selected_option && resp.selected_option === question.correct_option) ? 1 : 0;

      const entity = this.responseRepo.create({
        student_id,
        question_id: resp.question_id,
        selected_option: resp.selected_option,
        is_correct,
        status,
        created_by: +userId,
        updated_by: +userId,
      });

      return entity;
    });

    // We can use save() which handles UPSERT if we supply the IDs, or we can clear existing and insert
    // Using an upsert or transaction is safer, but for now we'll delete existing for this student and insert new

    await this.responseRepo.delete({ student_id });
    const saved = await this.responseRepo.save(responseEntities);

    return {
      message: 'OMR responses saved successfully',
      count: saved.length
    };
  }

  async getEntryStatus(udise?: string, regionId?: string) {
    let query = `
      SELECT 
        s.udise_code as udiseCode, 
        MAX(s.school_name) as schoolName,
        MAX(r.region_name) as regionName,
        MAX(r.region_id) as regionId,
        MAX(c.first_name) as coordFirstName,
        MAX(c.last_name) as coordLastName,
        COUNT(DISTINCT st.student_id) as expected,
        COUNT(DISTINCT IF(o.status = 1, o.student_id, NULL)) as completed,
        MAX(o.updated_at) as lastUpdated
      FROM school_master s
      LEFT JOIN region_master r ON s.region_id = r.region_id
      LEFT JOIN teacher_master c ON c.udise_code = s.udise_code AND c.user_id IN (SELECT user_id FROM user_master WHERE role_id = 3)
      LEFT JOIN student_master st ON st.udise_code = s.udise_code AND st.status = 1
      LEFT JOIN omr_student_response o ON o.student_id = st.student_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (udise) {
      query += ` AND s.udise_code = ?`;
      params.push(udise);
    }
    if (regionId) {
      query += ` AND r.region_id = ?`;
      params.push(regionId);
    }
    query += ` GROUP BY s.udise_code`;

    const rawData = await this.studentRepo.manager.query(query, params);

    let totalExpected = 0;
    let totalCompleted = 0;
    const alignedSchools = [];

    rawData.forEach((row: any, idx: number) => {
      const expected = parseInt(row.expected, 10) || 0;
      const completed = parseInt(row.completed, 10) || 0;
      const notStarted = expected - completed;
      const completionPercent = expected > 0 ? Math.round((completed / expected) * 100) : 0;

      totalExpected += expected;
      totalCompleted += completed;

      alignedSchools.push({
        id: idx + 1,
        udise: row.udiseCode,
        school: row.schoolName || '-',
        coordinator: row.coordFirstName ? `${row.coordFirstName} ${row.coordLastName || ''}`.trim() : '-',
        expected,
        completed,
        inProgress: 0,
        notStarted: notStarted > 0 ? notStarted : 0,
        completion: `${completionPercent}%`,
        status: completionPercent === 100 ? 'Completed' : (completionPercent > 0 ? 'In Progress' : 'Not Started'),
        updated: row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : '-'
      });
    });

    let trendQuery = `
      SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.student_id) as count
      FROM omr_student_response o
      JOIN student_master st ON o.student_id = st.student_id
      JOIN school_master s ON s.udise_code = st.udise_code
      LEFT JOIN teacher_master c ON c.udise_code = s.udise_code AND c.user_id IN (SELECT user_id FROM user_master WHERE role_id = 3)
      WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `;
    const trendParams: any[] = [];
    if (udise) {
      trendQuery += ` AND s.udise_code = ?`;
      trendParams.push(udise);
    }
    if (regionId) {
      trendQuery += ` AND s.region_id = ?`;
      trendParams.push(regionId);
    }
    trendQuery += ` GROUP BY DATE(o.created_at) ORDER BY date ASC`;

    const trendRaw = await this.studentRepo.manager.query(trendQuery, trendParams);

    const formattedTrend = trendRaw.map((t: any) => {
      const d = new Date(t.date);
      return {
        name: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: parseInt(t.count, 10)
      };
    });

    return {
      expected: totalExpected,
      completed: totalCompleted,
      inProgress: 0,
      notStarted: (totalExpected - totalCompleted) > 0 ? (totalExpected - totalCompleted) : 0,
      trend: formattedTrend,
      alignedSchools
    };
  }
}
