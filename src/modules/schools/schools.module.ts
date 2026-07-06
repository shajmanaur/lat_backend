import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SchoolMaster } from '../../entities/school-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolMaster])],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
