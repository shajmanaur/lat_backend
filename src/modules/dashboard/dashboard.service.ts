import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { SchoolMaster } from '../../entities/school-master.entity';
import { RegionMaster } from '../../entities/region-master.entity';
import { GradeMaster } from '../../entities/grade-master.entity';

@Injectable()
export class DashboardService {
  private static overviewCache = new Map<string, { data: any, timestamp: number }>();

  constructor(
    @InjectRepository(StudentMaster) private studentRepo: Repository<StudentMaster>,
    @InjectRepository(TeacherMaster) private teacherRepo: Repository<TeacherMaster>,
    @InjectRepository(UserMaster) private userRepo: Repository<UserMaster>,
    @InjectRepository(OmrStudentResponse) private omrRepo: Repository<OmrStudentResponse>,
    private dataSource: DataSource,
  ) {}

  private emptyTeacherStats() {
    return {
      totalAllocations: { grades: 0, sections: 0 },
      studentsAllocated: 0,
      omrCompleted: 0,
      pendingOmr: 0,
      allocations: [],
      activities: []
    };
  }

  async getOverviewStats(userId: number, roleId: number, filters?: { regionId?: number, udise?: string, gradeId?: number, section?: string }) {
    if (roleId === 4) {
      const teacher = await this.teacherRepo.findOne({ where: { user_id: userId } });
      if (!teacher) return this.emptyTeacherStats();

      const mappings = await this.dataSource.query(
        `SELECT * FROM teacher_grade_section_mappings WHERE teacher_id = ?`,
        [teacher.teacher_id]
      );

      if (mappings.length === 0) return this.emptyTeacherStats();

      let distinctGrades = new Set();
      let distinctSections = new Set();
      let totalStudentsAllocated = 0;
      let totalOmrCompleted = 0;
      const allocationsList = [];

      for (const m of mappings) {
        distinctGrades.add(m.grade);
        distinctSections.add(`${m.grade}-${m.section}`);

        const qb = this.studentRepo.createQueryBuilder('s')
          .leftJoin(GradeMaster, 'gm', 's.grade_id = gm.grade_id')
          .where('s.udise_code = :udiseCode', { udiseCode: m.udise_code })
          .andWhere('s.section = :section', { section: m.section })
          .andWhere('(gm.grade_name = :grade OR s.grade_id = :grade)', { grade: m.grade })
          .andWhere('s.status = :status', { status: 1 });
          
        const studentsInMapping = await qb.getCount();
        
        const omrQb = this.omrRepo.createQueryBuilder('omr')
          .innerJoin('omr.student', 's')
          .leftJoin(GradeMaster, 'gm', 's.grade_id = gm.grade_id')
          .select('COUNT(DISTINCT omr.student_id)', 'count')
          .where('s.udise_code = :udiseCode', { udiseCode: m.udise_code })
          .andWhere('s.section = :section', { section: m.section })
          .andWhere('(gm.grade_name = :grade OR s.grade_id = :grade)', { grade: m.grade })
          .andWhere('omr.status = 1');
          
        const omrRes = await omrQb.getRawOne();
        const omrCompleted = parseInt(omrRes?.count || '0', 10);

        totalStudentsAllocated += studentsInMapping;
        totalOmrCompleted += omrCompleted;

        allocationsList.push({
          grade: `Grade ${m.grade}`,
          section: m.section,
          students: studentsInMapping,
          completed: omrCompleted,
          status: studentsInMapping === 0 ? 'No Students' : (omrCompleted >= studentsInMapping ? 'Completed' : 'In Progress')
        });
      }

      const activitiesData = await this.omrRepo.createQueryBuilder('omr')
        .leftJoinAndSelect('omr.creator', 'creator')
        .leftJoinAndSelect('omr.student', 'student')
        .where('student.udise_code = :udiseCode', { udiseCode: teacher.udise_code })
        .orderBy('omr.created_at', 'DESC')
        .limit(4)
        .getMany();

      const formattedActivities = activitiesData.map((act, idx) => ({
        id: idx + 1,
        type: act.status === 1 ? 'completed' : 'progress',
        text: act.status === 1 ? 'OMR processing completed' : 'OMR entry in progress',
        subtext: `Student: ${act.student?.full_name || 'Unknown'}`,
        time: act.created_at, 
        icon_type: act.status === 1 ? 'check' : 'file',
        bg: act.status === 1 ? '#D1FAE5' : '#DBEAFE',
      }));

      return {
        totalAllocations: {
          grades: distinctGrades.size,
          sections: distinctSections.size
        },
        studentsAllocated: totalStudentsAllocated,
        omrCompleted: totalOmrCompleted,
        pendingOmr: Math.max(0, totalStudentsAllocated - totalOmrCompleted),
        allocations: allocationsList,
        activities: formattedActivities
      };
    }

    let udiseCode = filters?.udise || null;
    if (roleId === 3) {
      const coord = await this.teacherRepo.findOne({ where: { user_id: userId } });
      if (coord) udiseCode = coord.udise_code;
    }

    const tQb = this.userRepo.createQueryBuilder('u')
      .where('u.role_id = 4 AND u.status = "1"');
    if (udiseCode) {
      tQb.innerJoin(TeacherMaster, 't', 't.user_id = u.user_id')
         .andWhere('t.udise_code = :udiseCode', { udiseCode });
    }
    const totalTeachers = await tQb.getCount();

    const cQb = this.userRepo.createQueryBuilder('u')
      .where('u.role_id = 3 AND u.status = "1"');
    if (udiseCode) {
      cQb.innerJoin(TeacherMaster, 't', 't.user_id = u.user_id')
         .andWhere('t.udise_code = :udiseCode', { udiseCode });
    }
    if (filters?.regionId) {
      cQb.innerJoin(SchoolMaster, 'sm', 't.udise_code = sm.udise_code')
         .andWhere('sm.region_id = :regionId', { regionId: filters.regionId });
    }
    const totalCoordinators = await cQb.getCount();
    
    // For students
    const sQb = this.studentRepo.createQueryBuilder('s')
      .where('s.status = :status', { status: true });
    
    if (udiseCode) sQb.andWhere('s.udise_code = :udiseCode', { udiseCode });
    if (filters?.regionId && !udiseCode) {
      sQb.innerJoin(SchoolMaster, 'school', 'school.udise_code = s.udise_code')
         .andWhere('school.region_id = :regionId', { regionId: filters.regionId });
    }
    if (filters?.gradeId) sQb.andWhere('s.grade_id = :gradeId', { gradeId: filters.gradeId });
    if (filters?.section) sQb.andWhere('s.section = :section', { section: filters.section });
    
    const totalStudents = await sQb.getCount();

    // For OMR
    const buildOmrQb = () => {
      const qb = this.omrRepo.createQueryBuilder('omr');
      
      const needsStudentJoin = udiseCode || filters?.gradeId || filters?.section || filters?.regionId;
      
      if (needsStudentJoin) {
        qb.innerJoin('omr.student', 's');
        if (udiseCode) qb.andWhere('s.udise_code = :udiseCode', { udiseCode });
        if (filters?.regionId && !udiseCode) {
          qb.innerJoin(SchoolMaster, 'school', 'school.udise_code = s.udise_code')
            .andWhere('school.region_id = :regionId', { regionId: filters.regionId });
        }
        if (filters?.gradeId) qb.andWhere('s.grade_id = :gradeId', { gradeId: filters.gradeId });
        if (filters?.section) qb.andWhere('s.section = :section', { section: filters.section });
      }
      
      return qb;
    };

    const hasFilters = filters?.regionId || filters?.udise || filters?.gradeId || filters?.section;

    if (!hasFilters) {
      // Simple memory cache to prevent 6s queries on every dashboard load
      if (!DashboardService.overviewCache) {
        DashboardService.overviewCache = new Map();
      }
      const cacheKey = `${userId}_${roleId}_${udiseCode || 'admin'}`;
      const cached = DashboardService.overviewCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    const [presentResult, evaluatedResult, progressResult] = await Promise.all([
      buildOmrQb().select('COUNT(DISTINCT omr.student_id)', 'count').getRawOne(),
      buildOmrQb().select('COUNT(DISTINCT omr.student_id)', 'count').andWhere('omr.status = :status', { status: 1 }).getRawOne(),
      buildOmrQb().select('COUNT(DISTINCT omr.student_id)', 'count').andWhere('omr.status = :status', { status: 0 }).getRawOne()
    ]);

    const studentsPresent = parseInt(presentResult?.count || '0', 10);
    const studentsAbsent = Math.max(0, totalStudents - studentsPresent);
    const evaluatedCount = parseInt(evaluatedResult?.count || '0', 10);
    const progressCount = parseInt(progressResult?.count || '0', 10);

    const gradeQb = this.studentRepo.createQueryBuilder('s')
      .leftJoin(GradeMaster, 'gm', 's.grade_id = gm.grade_id')
      .select('gm.grade_name', 'name')
      .addSelect('COUNT(s.student_id)', 'students')
      .where('s.status = :status', { status: true });
    if (udiseCode) gradeQb.andWhere('s.udise_code = :udiseCode', { udiseCode });
    const gradeStats = await gradeQb.groupBy('gm.grade_name').getRawMany();

    const predefinedGrades = [
      { id: '3', name: 'Grade 3', fill: '#34D399' }, 
      { id: '6', name: 'Grade 6', fill: '#60A5FA' }, 
      { id: '9', name: 'Grade 9', fill: '#A78BFA' }
    ];

    const gradeData = predefinedGrades.map(pg => {
      const romanId = pg.id === '3' ? 'iii' : pg.id === '6' ? 'vi' : pg.id === '9' ? 'ix' : '';
      const found = gradeStats.find(g => {
        const name = String(g.name).toLowerCase();
        return name === pg.id || name === `0${pg.id}` || name === pg.name.toLowerCase() || name === romanId;
      });
      return {
        name: pg.name,
        students: found ? parseInt(found.students, 10) : 0,
        fill: pg.fill
      };
    });

    const regQb = this.dataSource.createQueryBuilder()
      .select('r.region_name', 'name')
      .addSelect('COUNT(s.student_id)', 'value')
      .from(StudentMaster, 's')
      .innerJoin(SchoolMaster, 'sm', 's.udise_code = sm.udise_code')
      .innerJoin(RegionMaster, 'r', 'sm.region_id = r.region_id')
      .where('s.status = :status', { status: true });
    if (udiseCode) regQb.andWhere('s.udise_code = :udiseCode', { udiseCode });
    const regionStats = await regQb.groupBy('r.region_name').orderBy('value', 'DESC').limit(5).getRawMany();
      
    const regionData = regionStats.map(r => ({
      name: r.name,
      value: parseInt(r.value, 10)
    }));

    const idQb = this.omrRepo.createQueryBuilder('omr')
      .select('omr.id', 'id')
      .orderBy('omr.created_at', 'DESC')
      .limit(4);
    if (udiseCode) {
      idQb.innerJoin('omr.student', 'student')
          .andWhere('student.udise_code = :udiseCode', { udiseCode });
    }
    const latestIdsRaw = await idQb.getRawMany();
    const latestIds = latestIdsRaw.map(r => r.id);

    let recentActivities = [];
    if (latestIds.length > 0) {
      recentActivities = await this.omrRepo.createQueryBuilder('omr')
        .leftJoinAndSelect('omr.creator', 'creator')
        .leftJoinAndSelect('omr.student', 'student')
        .where('omr.id IN (:...ids)', { ids: latestIds })
        .orderBy('omr.created_at', 'DESC')
        .getMany();
    }    
    const activities = recentActivities.map((act, idx) => ({
      id: idx + 1,
      type: act.status === 1 ? 'completed' : 'progress',
      text: act.status === 1 ? 'OMR processing completed' : 'OMR entry in progress',
      subtext: `Student: ${act.student?.full_name || 'Unknown'} | By: ${act.creator?.user_name || 'Unknown'}`,
      time: act.created_at, 
      icon_type: act.status === 1 ? 'check' : 'file',
      bg: act.status === 1 ? '#D1FAE5' : '#DBEAFE',
    }));

    const processingData = [
      { name: 'Not Started', value: studentsAbsent, color: '#94A3B8' },
      { name: 'OMR Entry in Progress', value: progressCount, color: '#F59E0B' },
      { name: 'Evaluated', value: evaluatedCount, color: '#10B981' },
    ];

    const result = {
      coordinators: totalCoordinators,
      teachers: totalTeachers,
      students: totalStudents,
      omrEntered: studentsPresent,
      studentsPresent: studentsPresent,
      studentsAbsent: studentsAbsent,
      evaluated: evaluatedCount,
      processingData,
      gradeData,
      regionData,
      activities
    };

    if (!hasFilters) {
      const cacheKey = `${userId}_${roleId}_${udiseCode || 'admin'}`;
      DashboardService.overviewCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return result;
  }
}
