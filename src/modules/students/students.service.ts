import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentMaster } from '../../entities/student-master.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentMaster)
    private readonly studentRepository: Repository<StudentMaster>,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: StudentMaster[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await this.studentRepository.findAndCount({
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
}
