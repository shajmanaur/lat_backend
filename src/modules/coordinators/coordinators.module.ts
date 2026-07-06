import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMaster } from '../../entities/user-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { CoordinatorsService } from './coordinators.service';
import { CoordinatorsController } from './coordinators.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserMaster, TeacherMaster])],
  controllers: [CoordinatorsController],
  providers: [CoordinatorsService],
  exports: [CoordinatorsService],
})
export class CoordinatorsModule {}
