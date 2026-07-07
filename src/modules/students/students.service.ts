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

  async findAll(page: number = 1, limit: number = 10, userId: number): Promise<{ data: StudentMaster[], total: number }> {
    const skip = (page - 1) * limit;

    const coord = await this.teacherRepository.findOne({ where: { user_id: userId } });
    const udise_code = coord ? coord.udise_code : null;
    
    if (!udise_code) {
      return { data: [], total: 0 };
    }
    
    const [data, total] = await this.studentRepository.findAndCount({
      where: { udise_code },
      order: {
        created_at: 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async findOne(id: number): Promise<StudentMaster> {
    return this.studentRepository.findOne({ where: { student_id: id } });
  }

  async createStudent(userId: number, payload: any) {
    const coord = await this.teacherRepository.findOne({ where: { user_id: userId } });
    if (!coord || !coord.udise_code) {
      throw new Error('Coordinator profile not found');
    }

    const { full_name, apaar_id, gender, grade, section } = payload;
    
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
      grade,
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

    const { full_name, apaar_id, gender, grade, section } = payload;
    
    student.full_name = full_name;
    student.apaar_id = apaar_id || null;
    if (gender) {
      student.gender = gender === 'Male' ? 'm' : gender === 'Female' ? 'f' : 'o';
    }
    student.grade = grade;
    student.section = section;
    student.updated_by = userId;

    await this.studentRepository.save(student);
    return student;
  }
}
