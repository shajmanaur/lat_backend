import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { SchoolMaster } from '../../entities/school-master.entity';
import { RegionMaster } from '../../entities/region-master.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(StudentMaster) private studentRepo: Repository<StudentMaster>,
    @InjectRepository(TeacherMaster) private teacherRepo: Repository<TeacherMaster>,
    @InjectRepository(UserMaster) private userRepo: Repository<UserMaster>,
    @InjectRepository(OmrStudentResponse) private omrRepo: Repository<OmrStudentResponse>,
    private dataSource: DataSource,
  ) {}

  async getOverviewStats(userId: number, roleId: number) {
    let udiseCode = null;
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
    const totalCoordinators = await cQb.getCount();
    
    // For students
    const sQb = this.studentRepo.createQueryBuilder('s')
      .where('s.status = :status', { status: true });
    if (udiseCode) sQb.andWhere('s.udise_code = :udiseCode', { udiseCode });
    const totalStudents = await sQb.getCount();

    // For OMR
    const buildOmrQb = () => {
      const qb = this.omrRepo.createQueryBuilder('omr');
      if (udiseCode) {
        qb.innerJoin('omr.student', 's')
          .andWhere('s.udise_code = :udiseCode', { udiseCode });
      }
      return qb;
    };

    const presentResult = await buildOmrQb()
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .getRawOne();
    const studentsPresent = parseInt(presentResult?.count || '0', 10);
    const studentsAbsent = Math.max(0, totalStudents - studentsPresent);

    const evaluatedResult = await buildOmrQb()
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .andWhere('omr.status = :status', { status: 1 })
      .getRawOne();
    const evaluatedCount = parseInt(evaluatedResult?.count || '0', 10);
    
    const progressResult = await buildOmrQb()
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .andWhere('omr.status = :status', { status: 0 })
      .getRawOne();
    const progressCount = parseInt(progressResult?.count || '0', 10);

    const gradeQb = this.studentRepo.createQueryBuilder('s')
      .select('s.grade', 'name')
      .addSelect('COUNT(s.student_id)', 'students')
      .where('s.status = :status', { status: true });
    if (udiseCode) gradeQb.andWhere('s.udise_code = :udiseCode', { udiseCode });
    const gradeStats = await gradeQb.groupBy('s.grade').getRawMany();

    const predefinedGrades = [
      { id: '3', name: 'Grade 3', fill: '#34D399' }, 
      { id: '6', name: 'Grade 6', fill: '#60A5FA' }, 
      { id: '9', name: 'Grade 9', fill: '#A78BFA' }
    ];

    const gradeData = predefinedGrades.map(pg => {
      const found = gradeStats.find(g => g.name === pg.id || g.name === `0${pg.id}` || g.name === pg.name);
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

    const actQb = this.omrRepo.createQueryBuilder('omr')
      .leftJoinAndSelect('omr.teacher', 'teacher')
      .leftJoinAndSelect('omr.student', 'student')
      .orderBy('omr.created_at', 'DESC')
      .take(4);
    if (udiseCode) actQb.andWhere('student.udise_code = :udiseCode', { udiseCode });
    const recentActivities = await actQb.getMany();
    
    const activities = recentActivities.map((act, idx) => ({
      id: idx + 1,
      type: act.status === 1 ? 'completed' : 'progress',
      text: act.status === 1 ? 'OMR processing completed' : 'OMR entry in progress',
      subtext: `Student: ${act.student?.full_name || 'Unknown'} | By: ${act.teacher?.user_name || 'Unknown'}`,
      time: act.created_at, 
      icon_type: act.status === 1 ? 'check' : 'file',
      bg: act.status === 1 ? '#D1FAE5' : '#DBEAFE',
    }));

    const processingData = [
      { name: 'Not Started', value: studentsAbsent, color: '#94A3B8' },
      { name: 'OMR Entry in Progress', value: progressCount, color: '#F59E0B' },
      { name: 'Evaluated', value: evaluatedCount, color: '#10B981' },
    ];

    return {
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
  }
}
