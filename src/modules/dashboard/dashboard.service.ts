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

  async getOverviewStats() {
    const totalCoordinators = await this.userRepo.count({ where: { role_id: 3, status: '1' } });
    const totalTeachers = await this.userRepo.count({ where: { role_id: 4, status: '1' } });
    const totalStudents = await this.studentRepo.count({ where: { status: true } });
    
    const presentResult = await this.omrRepo
      .createQueryBuilder('omr')
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .getRawOne();
    const studentsPresent = parseInt(presentResult.count || '0', 10);
    const studentsAbsent = Math.max(0, totalStudents - studentsPresent);

    const evaluatedResult = await this.omrRepo
      .createQueryBuilder('omr')
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .where('omr.status = :status', { status: 1 })
      .getRawOne();
    const evaluatedCount = parseInt(evaluatedResult.count || '0', 10);
    
    const progressResult = await this.omrRepo
      .createQueryBuilder('omr')
      .select('COUNT(DISTINCT omr.student_id)', 'count')
      .where('omr.status = :status', { status: 0 })
      .getRawOne();
    const progressCount = parseInt(progressResult.count || '0', 10);
    
    const gradeStats = await this.studentRepo
      .createQueryBuilder('s')
      .select('s.grade', 'name')
      .addSelect('COUNT(s.student_id)', 'students')
      .where('s.status = :status', { status: true })
      .groupBy('s.grade')
      .getRawMany();
      
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

    const regionStats = await this.dataSource.createQueryBuilder()
      .select('r.region_name', 'name')
      .addSelect('COUNT(s.student_id)', 'value')
      .from(StudentMaster, 's')
      .innerJoin(SchoolMaster, 'sm', 's.udise_code = sm.udise_code')
      .innerJoin(RegionMaster, 'r', 'sm.region_id = r.region_id')
      .where('s.status = :status', { status: true })
      .groupBy('r.region_name')
      .orderBy('value', 'DESC')
      .limit(5)
      .getRawMany();
      
    const regionData = regionStats.map(r => ({
      name: r.name,
      value: parseInt(r.value, 10)
    }));

    const recentActivities = await this.omrRepo.find({
      relations: ['teacher', 'student'],
      order: { created_at: 'DESC' },
      take: 4,
    });
    
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
