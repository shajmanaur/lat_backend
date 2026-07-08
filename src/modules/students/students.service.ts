import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentMaster)
    private readonly studentRepository: Repository<StudentMaster>,
    @InjectRepository(TeacherMaster)
    private readonly teacherRepository: Repository<TeacherMaster>,
  ) {}

  async findAll(
    page: number = 1, 
    limit: number = 10, 
    userId: number, 
    roleId: number = 3,
    filters?: { regionId?: number, udise?: string, gradeId?: number, section?: string, search?: string }
  ): Promise<{ data: any[], total: number }> {
    const skip = (page - 1) * limit;

    let udise_code = filters?.udise || null;
    
    // If not admin, restrict by udise_code
    if (roleId !== 2 && roleId !== 1) {
      const coord = await this.teacherRepository.findOne({ where: { user_id: userId } });
      const coordUdise = coord ? coord.udise_code : null;
      
      if (!coordUdise) {
        return { data: [], total: 0 };
      }
      udise_code = coordUdise;
    }
    
    const qb = this.studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.grade', 'grade')
      .orderBy('student.created_at', 'DESC');

    if (roleId === 2 || roleId === 1) {
      qb.leftJoin('school_master', 'school', 'school.udise_code = student.udise_code')
        .leftJoin('teacher_master', 'teacher', 'teacher.udise_code = school.udise_code')
        .leftJoin('user_master', 'user', 'user.user_id = teacher.user_id')
        .addSelect(['school.school_name', 'teacher.first_name', 'teacher.last_name', 'user.user_name']);

      if (filters?.regionId) {
        qb.andWhere('school.region_id = :regionId', { regionId: filters.regionId });
      }
    }

    if (udise_code) {
      qb.andWhere('student.udise_code = :udise', { udise: udise_code });
    }

    if (filters?.gradeId) {
      qb.andWhere('student.grade_id = :gradeId', { gradeId: filters.gradeId });
    }

    if (filters?.section && filters.section !== 'All Sections') {
      qb.andWhere('student.section = :section', { section: filters.section });
    }

    if (filters?.search) {
      qb.andWhere('(student.full_name LIKE :search OR student.apaar_id LIKE :search)', { search: `%${filters.search}%` });
    }

    const total = await qb.getCount();
    const { entities, raw } = await qb.skip(skip).take(limit).getRawAndEntities();

    const mappedData = entities.map(entity => {
      const rawRow = raw.find(r => r.student_student_id === entity.student_id);
      
      let coordinatorName = null;
      if (rawRow) {
        if (rawRow.teacher_first_name) {
          coordinatorName = `${rawRow.teacher_first_name} ${rawRow.teacher_last_name || ''}`.trim();
        } else if (rawRow.user_user_name) {
          coordinatorName = rawRow.user_user_name;
        }
      }

      return {
        ...entity,
        school_name: rawRow ? rawRow.school_school_name : null,
        coordinator_name: coordinatorName
      };
    });

    return { data: mappedData, total };
  }

  async getDistinctSections(udise?: string, gradeId?: number): Promise<string[]> {
    const qb = this.studentRepository.createQueryBuilder('s')
      .select('DISTINCT s.section', 'section')
      .where('s.section IS NOT NULL')
      .andWhere('s.section != ""');
      
    if (udise) {
      qb.andWhere('s.udise_code = :udise', { udise });
    }
    if (gradeId) {
      qb.andWhere('s.grade_id = :gradeId', { gradeId });
    }
    
    const results = await qb.orderBy('s.section', 'ASC').getRawMany();
    return results.map(r => r.section);
  }

  async findOne(id: number): Promise<StudentMaster> {
    return this.studentRepository.findOne({ where: { student_id: id }, relations: ['grade'] });
  }

  async createStudent(userId: number, payload: any) {
    const coord = await this.teacherRepository.findOne({ where: { user_id: userId } });
    if (!coord || !coord.udise_code) {
      throw new Error('Coordinator profile not found');
    }

    const { full_name, apaar_id, gender, grade_id, section } = payload;
    
    // Auto increment roll number for simplicity in this mock
    const [lastStudent] = await this.studentRepository.find({
      order: { roll_num: 'DESC' },
      take: 1
    });
    const roll_num = lastStudent ? lastStudent.roll_num + 1 : 1;

    const student = this.studentRepository.create({
      full_name,
      apaar_id: apaar_id || null,
      gender: gender === 'Male' ? 'm' : gender === 'Female' ? 'f' : 'o',
      grade_id: +grade_id,
      section,
      udise_code: coord.udise_code,
      roll_num,
      created_by: userId,
      status: true
    });

    await this.studentRepository.save(student);
    return student;
  }

  async updateStudent(id: number, userId: number, payload: any) {
    const coord = await this.teacherRepository.findOne({ where: { user_id: userId } });
    if (!coord || !coord.udise_code) {
      throw new Error('Coordinator profile not found');
    }

    const student = await this.studentRepository.findOne({ where: { student_id: id, udise_code: coord.udise_code } });
    if (!student) {
      throw new Error('Student not found or unauthorized');
    }

    const { full_name, apaar_id, gender, grade_id, section } = payload;
    
    student.full_name = full_name;
    student.apaar_id = apaar_id || null;
    if (gender) {
      student.gender = gender === 'Male' ? 'm' : gender === 'Female' ? 'f' : 'o';
    }
    if (grade_id) {
      student.grade_id = +grade_id;
    }
    student.section = section;
    student.updated_by = userId;

    await this.studentRepository.save(student);
    return student;
  }
}
