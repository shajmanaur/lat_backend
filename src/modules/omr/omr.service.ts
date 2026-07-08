import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
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
      // It's a teacher, filter by allocations using teacher_id from teacher_master
      const mappings = await this.mappingRepo.find({ where: { teacher_id: String(teacher.teacher_id) } });
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

  async getEvaluationStatus(filters?: { regionId?: string; udise?: string; gradeId?: string }) {
    let query = `
      SELECT 
        s.udise_code as udiseCode, 
        MAX(s.school_name) as schoolName,
        MAX(rm.region_name) as regionName,
        MAX(rm.region_id) as regionId,
        MAX(c.first_name) as coordFirstName,
        MAX(c.last_name) as coordLastName,
        COUNT(DISTINCT st.student_id) as expected,
        COUNT(DISTINCT IF(o.status = 1, o.student_id, NULL)) as completed,
        COUNT(DISTINCT rep.student_id) as evaluated
      FROM school_master s
      LEFT JOIN region_master rm ON s.region_id = rm.region_id
      LEFT JOIN teacher_master c ON c.udise_code = s.udise_code AND c.user_id IN (SELECT user_id FROM user_master WHERE role_id = 3)
      LEFT JOIN student_master st ON st.udise_code = s.udise_code AND st.status = 1
      LEFT JOIN omr_student_response o ON o.student_id = st.student_id
      LEFT JOIN report_student_scores rep ON rep.student_id = st.student_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.udise && filters.udise !== 'All Schools') {
      query += ` AND s.udise_code = ?`;
      params.push(filters.udise);
    }
    if (filters?.regionId && filters.regionId !== 'All Regions') {
      query += ` AND s.region_id = ?`;
      params.push(filters.regionId);
    }
    if (filters?.gradeId && filters.gradeId !== 'All Grades') {
      query += ` AND st.grade_id = ?`;
      params.push(filters.gradeId);
    }
    query += ` GROUP BY s.udise_code`;

    const rawData = await this.studentRepo.manager.query(query, params);

    let totalStudents = 0;
    let omrCompleted = 0;
    let evaluated = 0;
    let evaluationErrors = 0;

    const schoolsData = rawData.map((row: any, idx: number) => {
      const exp = parseInt(row.expected, 10) || 0;
      const comp = parseInt(row.completed, 10) || 0;
      const evald = parseInt(row.evaluated, 10) || 0;

      totalStudents += exp;
      omrCompleted += comp;
      evaluated += evald;

      let status = 'Pending';
      if (evald > 0 && evald >= comp && comp > 0) status = 'Completed';
      else if (evald > 0 && evald < comp) status = 'In Progress';

      return {
        id: idx + 1,
        udise: row.udiseCode,
        school: row.schoolName || '-',
        region: row.regionName || '-',
        coordinator: row.coordFirstName ? `${row.coordFirstName} ${row.coordLastName || ''}`.trim() : '-',
        students: exp.toLocaleString('en-IN'),
        completed: `${comp.toLocaleString('en-IN')} (${exp > 0 ? Math.round((comp/exp)*100) : 0}%)`,
        status: status,
        updated: status !== 'Pending' ? new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
        action: status === 'Pending' ? 'Run Evaluation' : 'View Details'
      };
    });

    return {
      summary: {
        totalStudents,
        omrCompleted,
        pendingEvaluation: Math.max(0, omrCompleted - evaluated),
        evaluated,
        evaluationErrors
      },
      schoolsData
    };
  }

  async runEvaluation(udise: string) {
    if (!udise) throw new BadRequestException('UDISE code required');
    
    const query = `
      INSERT INTO report_student_scores 
        (student_id, grade_id, region_id, region_name, udise_code, school_name, correct, total, pct)
      SELECT 
        st.student_id,
        st.grade_id,
        sm.region_id,
        rm.region_name,
        st.udise_code,
        sm.school_name,
        SUM(IF(o.is_correct = 1, 1, 0)) as correct,
        COUNT(o.question_id) as total,
        ROUND((SUM(IF(o.is_correct = 1, 1, 0)) / COUNT(o.question_id)) * 100, 2) as pct
      FROM student_master st
      JOIN school_master sm ON sm.udise_code = st.udise_code
      LEFT JOIN region_master rm ON rm.region_id = sm.region_id
      JOIN omr_student_response o ON o.student_id = st.student_id AND o.status = 1
      WHERE st.udise_code = ?
      GROUP BY st.student_id
      ON DUPLICATE KEY UPDATE 
        correct = VALUES(correct),
        total = VALUES(total),
        pct = VALUES(pct)
    `;

    await this.studentRepo.manager.query(query, [udise]);
    return { message: 'Evaluation completed successfully' };
  }

  normalizeGrade(grade: string): string {
    if (!grade) return '';
    const clean = grade.toUpperCase().trim();
    if (clean === '3' || clean === 'III' || clean === 'G3' || clean === 'GRADE 3' || clean === 'GRADE III') {
      return 'III';
    }
    if (clean === '6' || clean === 'VI' || clean === 'G6' || clean === 'GRADE 6' || clean === 'GRADE VI') {
      return 'VI';
    }
    if (clean === '9' || clean === 'IX' || clean === 'G9' || clean === 'GRADE 9' || clean === 'GRADE IX') {
      return 'IX';
    }
    if (clean === '5' || clean === 'V' || clean === 'G5' || clean === 'GRADE 5' || clean === 'GRADE V') {
      return 'V';
    }
    if (clean === '8' || clean === 'VIII' || clean === 'G8' || clean === 'GRADE 8' || clean === 'GRADE VIII') {
      return 'VIII';
    }
    return clean;
  }

  async getTeacherOmrSummary(userId: number) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      return {
        totalGradesAssigned: 0,
        totalStudents: 0,
        omrCompleted: 0,
        pending: 0,
      };
    }

    const mappings = await this.mappingRepo.find({
      where: { teacher_id: String(teacher.teacher_id), udise_code: teacher.udise_code }
    });

    if (mappings.length === 0) {
      return {
        totalGradesAssigned: 0,
        totalStudents: 0,
        omrCompleted: 0,
        pending: 0,
      };
    }

    const uniqueGrades = new Set(mappings.map(m => this.normalizeGrade(m.grade)));
    const totalGradesAssigned = uniqueGrades.size;

    const gradesList = await this.gradeRepo.find();
    const getGradeId = (name: string) => {
      const normalized = this.normalizeGrade(name);
      const found = gradesList.find(g => this.normalizeGrade(g.grade_name) === normalized);
      return found ? found.grade_id : null;
    };

    const gradeSectionConditions = mappings.map(m => {
      const gid = getGradeId(m.grade);
      return { grade_id: gid, section: m.section };
    }).filter(c => c.grade_id !== null);

    if (gradeSectionConditions.length === 0) {
      return {
        totalGradesAssigned,
        totalStudents: 0,
        omrCompleted: 0,
        pending: 0,
      };
    }

    const qb = this.studentRepo.createQueryBuilder('s')
      .where('s.udise_code = :udiseCode', { udiseCode: teacher.udise_code })
      .andWhere('s.status = :status', { status: true });

    const orConditions = gradeSectionConditions.map((cond, idx) => {
      return `(s.grade_id = :gradeId_${idx} AND s.section = :section_${idx})`;
    });

    const params: any = {};
    gradeSectionConditions.forEach((cond, idx) => {
      params[`gradeId_${idx}`] = cond.grade_id;
      params[`section_${idx}`] = cond.section;
    });

    qb.andWhere(`(${orConditions.join(' OR ')})`, params);

    const students = await qb.getMany();
    const totalStudents = students.length;

    let omrCompleted = 0;
    if (totalStudents > 0) {
      const studentIds = students.map(s => s.student_id);
      
      const compRes = await this.responseRepo.createQueryBuilder('resp')
        .select('COUNT(DISTINCT resp.student_id)', 'count')
        .where('resp.student_id IN (:...studentIds)', { studentIds })
        .andWhere('resp.status = 1')
        .getRawOne();
        
      omrCompleted = parseInt(compRes?.count || '0', 10);
    }

    return {
      totalGradesAssigned,
      totalStudents,
      omrCompleted,
      pending: Math.max(0, totalStudents - omrCompleted),
    };
  }

  async getTeacherOmrGrades(userId: number) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      return [];
    }

    const mappings = await this.mappingRepo.find({
      where: { teacher_id: String(teacher.teacher_id), udise_code: teacher.udise_code }
    });

    if (mappings.length === 0) {
      return [];
    }

    const gradesList = await this.gradeRepo.find();
    
    const gradeGroupMap = new Map<string, { gradeVal: string; sections: string[] }>();
    mappings.forEach(m => {
      const norm = this.normalizeGrade(m.grade);
      if (!gradeGroupMap.has(norm)) {
        gradeGroupMap.set(norm, { gradeVal: m.grade, sections: [] });
      }
      if (!gradeGroupMap.get(norm)!.sections.includes(m.section)) {
        gradeGroupMap.get(norm)!.sections.push(m.section);
      }
    });

    const result = [];

    for (const [normGrade, group] of gradeGroupMap.entries()) {
      const gradeRecord = gradesList.find(g => this.normalizeGrade(g.grade_name) === normGrade);
      if (!gradeRecord) continue;

      const gradeId = gradeRecord.grade_id;

      const assessment = await this.assessmentRepo.createQueryBuilder('a')
        .innerJoin('a.questions', 'q')
        .where('q.grade_id = :gradeId', { gradeId })
        .andWhere('a.status = 1')
        .getOne();

      const students = await this.studentRepo.find({
        where: group.sections.map(sec => ({
          udise_code: teacher.udise_code,
          grade_id: gradeId,
          section: sec,
          status: true
        }))
      });

      const totalStudents = students.length;
      let completedCount = 0;
      let pendingCount = totalStudents;
      let lastOmrEntry: Date | null = null;

      if (totalStudents > 0) {
        const studentIds = students.map(s => s.student_id);

        const responses = await this.responseRepo.createQueryBuilder('resp')
          .select('resp.student_id', 'student_id')
          .addSelect('MAX(resp.status)', 'status')
          .addSelect('MAX(resp.updated_at)', 'lastSaved')
          .where('resp.student_id IN (:...studentIds)', { studentIds })
          .groupBy('resp.student_id')
          .getRawMany();

        completedCount = responses.filter(r => Number(r.status) === 1).length;
        pendingCount = totalStudents - completedCount;

        let maxTime = 0;
        responses.forEach(r => {
          if (r.lastSaved) {
            const t = new Date(r.lastSaved).getTime();
            if (t > maxTime) maxTime = t;
          }
        });
        if (maxTime > 0) {
          lastOmrEntry = new Date(maxTime);
        }
      }

      const formattedLastEntry = lastOmrEntry 
        ? lastOmrEntry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '')
        : '-';

      result.push({
        grade: `G${gradeId}`,
        gradeName: `Grade ${gradeRecord.grade_name}`,
        gradeId,
        testName: assessment ? assessment.assessment_name : 'No Active Assessment',
        testDate: assessment && assessment.exam_start_date ? new Date(assessment.exam_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        sections: group.sections.sort().join(', '),
        students: totalStudents,
        completed: completedCount,
        completedPct: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
        pending: pendingCount,
        pendingPct: totalStudents > 0 ? Math.round((pendingCount / totalStudents) * 100) : 0,
        lastOmrEntry: formattedLastEntry,
      });
    }

    return result;
  }

  async getTeacherOmrStudents(userId: number, gradeId: number, section?: string, search?: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      throw new BadRequestException('Teacher profile not found');
    }

    const gradeRecord = await this.gradeRepo.findOne({ where: { grade_id: gradeId } });
    if (!gradeRecord) {
      throw new BadRequestException('Invalid grade selected');
    }

    const mappings = await this.mappingRepo.find({
      where: { teacher_id: String(teacher.teacher_id), udise_code: teacher.udise_code }
    });

    const gradeMappings = mappings.filter(m => this.normalizeGrade(m.grade) === this.normalizeGrade(gradeRecord.grade_name));
    if (gradeMappings.length === 0) {
      throw new BadRequestException('You are not mapped to this grade');
    }

    let sectionsToQuery = gradeMappings.map(m => m.section);
    if (section && section !== 'All Sections') {
      if (!sectionsToQuery.includes(section)) {
        throw new BadRequestException(`You are not mapped to section ${section}`);
      }
      sectionsToQuery = [section];
    }

    const qb = this.studentRepo.createQueryBuilder('s')
      .where('s.udise_code = :udiseCode', { udiseCode: teacher.udise_code })
      .andWhere('s.grade_id = :gradeId', { gradeId })
      .andWhere('s.section IN (:...sections)', { sections: sectionsToQuery })
      .andWhere('s.status = :status', { status: true })
      .orderBy('s.roll_num', 'ASC')
      .addOrderBy('s.full_name', 'ASC');

    if (search) {
      qb.andWhere('(s.full_name LIKE :search OR s.apaar_id LIKE :search)', { search: `%${search}%` });
    }

    const students = await qb.getMany();
    const totalStudents = students.length;

    let completedCount = 0;
    let pendingCount = totalStudents;
    let lastOmrEntry: Date | null = null;
    let studentList = [];

    if (totalStudents > 0) {
      const studentIds = students.map(s => s.student_id);

      const responses = await this.responseRepo.createQueryBuilder('resp')
        .select('resp.student_id', 'student_id')
        .addSelect('MAX(resp.status)', 'status')
        .addSelect('MAX(resp.updated_at)', 'lastSaved')
        .where('resp.student_id IN (:...studentIds)', { studentIds })
        .groupBy('resp.student_id')
        .getRawMany();

      const responseMap = new Map();
      responses.forEach(r => responseMap.set(Number(r.student_id), r));

      completedCount = responses.filter(r => Number(r.status) === 1).length;
      pendingCount = totalStudents - completedCount;

      let maxTime = 0;
      responses.forEach(r => {
        if (r.lastSaved) {
          const t = new Date(r.lastSaved).getTime();
          if (t > maxTime) maxTime = t;
        }
      });
      if (maxTime > 0) {
        lastOmrEntry = new Date(maxTime);
      }

      studentList = students.map(s => {
        const respInfo = responseMap.get(Number(s.student_id));
        let omrStatus = 'Pending';
        if (respInfo) {
          omrStatus = Number(respInfo.status) === 1 ? 'Completed' : 'In Progress';
        }
        return {
          student_id: s.student_id,
          full_name: s.full_name,
          roll_num: s.roll_num,
          apaar_id: s.apaar_id || '-',
          section: s.section,
          omr_status: omrStatus,
          last_updated: respInfo?.lastSaved 
            ? new Date(respInfo.lastSaved).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '')
            : '-'
        };
      });
    }

    const formattedLastEntry = lastOmrEntry 
      ? lastOmrEntry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '')
      : '-';

    return {
      summary: {
        totalStudents,
        omrCompleted: completedCount,
        completedPct: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
        pending: pendingCount,
        pendingPct: totalStudents > 0 ? Math.round((pendingCount / totalStudents) * 100) : 0,
        lastOmrEntry: formattedLastEntry,
      },
      students: studentList
    };
  }

  async submitTeacherGradeOmr(userId: number, gradeId: number, section?: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      throw new BadRequestException('Teacher profile not found');
    }

    const gradeRecord = await this.gradeRepo.findOne({ where: { grade_id: gradeId } });
    if (!gradeRecord) {
      throw new BadRequestException('Invalid grade selected');
    }

    const mappings = await this.mappingRepo.find({
      where: { teacher_id: String(teacher.teacher_id), udise_code: teacher.udise_code }
    });

    const gradeMappings = mappings.filter(m => this.normalizeGrade(m.grade) === this.normalizeGrade(gradeRecord.grade_name));
    if (gradeMappings.length === 0) {
      throw new BadRequestException('You are not mapped to this grade');
    }

    let sectionsToSubmit = gradeMappings.map(m => m.section);
    if (section && section !== 'All Sections') {
      if (!sectionsToSubmit.includes(section)) {
        throw new BadRequestException(`You are not mapped to section ${section}`);
      }
      sectionsToSubmit = [section];
    }

    const students = await this.studentRepo.find({
      where: sectionsToSubmit.map(sec => ({
        udise_code: teacher.udise_code,
        grade_id: gradeId,
        section: sec,
        status: true
      }))
    });

    if (students.length === 0) {
      return { message: 'No students found in this grade and section', updatedCount: 0 };
    }

    const studentIds = students.map(s => s.student_id);

    const updateResult = await this.responseRepo.createQueryBuilder()
      .update(OmrStudentResponse)
      .set({ status: 1, updated_by: userId, updated_at: new Date() })
      .where('student_id IN (:...studentIds)', { studentIds })
      .andWhere('status = 0')
      .execute();

    return {
      message: 'OMR responses submitted successfully',
      updatedCount: updateResult.affected || 0
    };
  }

  async validateTeacherAccessToStudent(userId: number, studentId: number) {
    const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!teacher || !teacher.udise_code) {
      throw new ForbiddenException('Teacher profile not found or invalid');
    }

    const student = await this.studentRepo.findOne({ where: { student_id: studentId }, relations: ['grade'] });
    if (!student) {
      throw new BadRequestException('Student not found');
    }

    if (student.udise_code !== teacher.udise_code) {
      throw new ForbiddenException('You are not authorized to access students from another school');
    }

    const mappings = await this.mappingRepo.find({
      where: {
        teacher_id: String(teacher.teacher_id),
        udise_code: teacher.udise_code,
        section: student.section
      }
    });

    const studentGradeName = student.grade?.grade_name || '';
    const hasAccess = mappings.some(m => this.normalizeGrade(m.grade) === this.normalizeGrade(studentGradeName));

    if (!hasAccess) {
      throw new ForbiddenException('You are not authorized to access this student as you are not mapped to this grade/section');
    }
  }
}
