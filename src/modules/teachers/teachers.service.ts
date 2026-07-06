import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';
import { TeacherGradeSectionMapping } from '../../entities/teacher-grade-section-mapping.entity';
import { GradeMaster } from '../../entities/grade-master.entity';
import { StudentMaster } from '../../entities/student-master.entity';
import { MailService } from '../mail/mail.service';
import { encrypt } from '../../utils/encryption';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(TeacherMaster)
    private readonly teacherRepo: Repository<TeacherMaster>,
    @InjectRepository(UserMaster)
    private readonly userRepo: Repository<UserMaster>,
    @InjectRepository(TeacherGradeSectionMapping)
    private readonly mappingRepo: Repository<TeacherGradeSectionMapping>,
    @InjectRepository(GradeMaster)
    private readonly gradeRepo: Repository<GradeMaster>,
    @InjectRepository(StudentMaster)
    private readonly studentRepo: Repository<StudentMaster>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: number, roleId: number) {
    const qb = this.teacherRepo.createQueryBuilder('t');
    
    // For Coordinator, we fetch their own school teachers
    if (roleId === 3) {
      const coord = await this.teacherRepo.findOne({ where: { user_id: userId } });
      if (coord && coord.udise_code) {
        qb.where('t.udise_code = :udiseCode', { udiseCode: coord.udise_code });
      } else {
        qb.where('t.created_by = :userId', { userId });
      }
    }

    const teachers = await qb.getMany();
    const mappings = await this.mappingRepo.find();

    const formattedTeachers = teachers.map(t => {
      const teacherMapping = mappings.find(m => m.teacher_id === t.teacher_id?.toString() || m.teacher_id == (t.user_id as any));
      
      const grade = teacherMapping ? `Grade ${teacherMapping.grade}` : 'Unassigned';
      const section = teacherMapping ? teacherMapping.section : '-';
      
      return {
        id: t.teacher_id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Teacher ${t.teacher_id}`,
        email: t.email_id || '-',
        mobile: t.mobile_no || '-',
        grade: grade,
        section: section,
        status: t.status ? 'Active' : 'Inactive',
        assignedOn: new Date(t.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
    });

    const total = formattedTeachers.length;
    const active = formattedTeachers.filter(t => t.status === 'Active').length;
    const inactive = formattedTeachers.filter(t => t.status === 'Inactive').length;
    const unassigned = formattedTeachers.filter(t => t.grade === 'Unassigned').length;

    return {
      status: true,
      data: {
        teachers: formattedTeachers,
        stats: { total, active, inactive, unassigned }
      }
    };
  }

  async getGrades() {
    return this.gradeRepo.find({ where: { status: true } });
  }

  async getSections(userId: number, grade: string) {
    const coordinator = await this.teacherRepo.findOne({
      where: { user_id: userId },
    });
    
    if (!coordinator) return [];

    const sections = await this.studentRepo
      .createQueryBuilder('student')
      .select('DISTINCT(student.section)', 'section')
      .where('student.udise_code = :udiseCode', { udiseCode: coordinator.udise_code })
      .andWhere('LOWER(student.grade) = LOWER(:grade)', { grade })
      .getRawMany();

    return sections.map(s => s.section).filter(Boolean);
  }

  async createTeacher(payload: any, creatorUserId: number) {
    const { name, email, mobile, gender, designation } = payload;

    // Find coordinator details to inherit school and region
    const coord = await this.teacherRepo.findOne({ where: { user_id: creatorUserId } });
    if (!coord) throw new BadRequestException('Coordinator profile not found');

    // Check if user exists
    let existingUser = await this.userRepo.findOne({
      where: [{ email: email }, { user_mobile: mobile }]
    });

    if (existingUser) {
      throw new BadRequestException('Teacher with this email or mobile already exists');
    }

    let newTeacher;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = this.userRepo.create({
        user_name: email,
        email: email,
        user_mobile: mobile,
        password: encrypt(mobile), // encrypted default password
        role_id: 4, // 4 = Teacher
        user_type_id: 4,
        status: '1',
        created_by: creatorUserId,
      });
      await queryRunner.manager.save(user);

      const nameParts = name.split(' ');
      newTeacher = this.teacherRepo.create({
        user_id: user.user_id,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
        email_id: email,
        mobile_no: mobile,
        gender: gender === 'Male' ? 1 : gender === 'Female' ? 2 : 0,
        designation: designation,
        udise_code: coord.udise_code,
        region_id: coord.region_id,
        country: coord.country || 'India',
        created_by: creatorUserId,
        status: true
      });
      await queryRunner.manager.save(newTeacher);

      await queryRunner.commitTransaction();
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to create teacher');
    } finally {
      await queryRunner.release();
    }

    // Send Welcome Email
    try {
      await this.mailService.sendWelcomeEmail(
        email,
        'TEACHER',
        email, // Username is email
        mobile, // Password is mobile
        `${coord.first_name} ${coord.last_name || ''}`.trim(), // Coordinator Name
        coord.udise_code // School
      );
    } catch (e) {
      console.error('Failed to send welcome email to', email, e);
    }

    return { status: true, message: 'Teacher created successfully', data: newTeacher };
  }

  async updateTeacher(id: number, payload: any, userId: number) {
    const teacher = await this.teacherRepo.findOne({ where: { teacher_id: id } });
    if (!teacher) throw new BadRequestException('Teacher not found');

    const user = await this.userRepo.findOne({ where: { user_id: teacher.user_id } });

    if (payload.name) {
      const nameParts = payload.name.split(' ');
      teacher.first_name = nameParts[0];
      teacher.last_name = nameParts.slice(1).join(' ');
    }
    if (payload.email) {
      teacher.email_id = payload.email;
      if (user) {
        user.email = payload.email;
        user.user_name = payload.email;
      }
    }
    if (payload.mobile) {
      teacher.mobile_no = payload.mobile;
      if (user) {
        user.user_mobile = payload.mobile;
      }
    }
    if (payload.gender) teacher.gender = payload.gender === 'Male' ? 1 : payload.gender === 'Female' ? 2 : 0;
    if (payload.designation) teacher.designation = payload.designation;

    teacher.updated_by = userId;
    teacher.updated_date = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(teacher);
      if (user) {
        user.updated_by = userId;
        await queryRunner.manager.save(user);
      }
      await queryRunner.commitTransaction();
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to update teacher');
    } finally {
      await queryRunner.release();
    }

    return { status: true, message: 'Teacher updated successfully' };
  }

  async toggleStatus(id: number, userId: number) {
    const teacher = await this.teacherRepo.findOne({ where: { teacher_id: id } });
    if (!teacher) throw new BadRequestException('Teacher not found');

    const user = await this.userRepo.findOne({ where: { user_id: teacher.user_id } });

    teacher.status = !teacher.status;
    teacher.updated_by = userId;
    teacher.updated_date = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(teacher);
      if (user) {
        user.status = teacher.status ? '1' : '0';
        user.updated_by = userId;
        await queryRunner.manager.save(user);
      }
      await queryRunner.commitTransaction();
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to toggle status');
    } finally {
      await queryRunner.release();
    }

    return { status: true, message: 'Status updated successfully', data: { status: teacher.status ? 'Active' : 'Inactive' } };
  }
}
