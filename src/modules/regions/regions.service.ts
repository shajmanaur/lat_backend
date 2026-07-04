import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionMaster } from '../../entities/region-master.entity';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(RegionMaster)
    private readonly regionRepository: Repository<RegionMaster>,
  ) {}

  async findAll(): Promise<RegionMaster[]> {
    return this.regionRepository.find({
      order: {
        region_name: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<RegionMaster> {
    return this.regionRepository.findOne({ where: { region_id: id } });
  }
}
