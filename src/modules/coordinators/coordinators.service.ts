import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMaster } from '../../entities/user-master.entity';

@Injectable()
export class CoordinatorsService {
  constructor(
    @InjectRepository(UserMaster)
    private readonly userRepository: Repository<UserMaster>,
  ) {}

  async findAll(): Promise<UserMaster[]> {
    // Assuming role_id 2 or user_type_id for coordinator
    return this.userRepository.find({
      order: {
        created_at: 'DESC',
      },
      take: 50,
    });
  }
}
