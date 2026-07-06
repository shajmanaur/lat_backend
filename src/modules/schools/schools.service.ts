import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolMaster } from '../../entities/school-master.entity';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(SchoolMaster)
    private readonly schoolRepo: Repository<SchoolMaster>,
  ) {}

  async getSchoolsByRegion(regionId: number): Promise<SchoolMaster[]> {
    return this.schoolRepo.find({
      where: { region_id: regionId },
      order: { school_name: 'ASC' },
    });
  }
}
