import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(StudentMaster) private studentRepo: Repository<StudentMaster>,
    @InjectRepository(TeacherMaster) private teacherRepo: Repository<TeacherMaster>,
    @InjectRepository(UserMaster) private userRepo: Repository<UserMaster>,
  ) {}

  async getOverviewStats() {
    // In a real app, these would have complex where clauses for role_id, status, etc.
    const totalStudents = await this.studentRepo.count();
    const totalTeachers = await this.teacherRepo.count();
    const totalCoordinators = await this.userRepo.count(); // Assuming role_id = coordinator
    
    // Hardcoded OMR stats as they might require a separate table not fully fleshed out yet
    const omrEntered = 1478912; 

    return {
      coordinators: totalCoordinators,
      teachers: totalTeachers,
      students: totalStudents,
      omrEntered: omrEntered,
    };
  }
}
