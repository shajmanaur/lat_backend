import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentMaster, TeacherMaster, UserMaster, OmrStudentResponse])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
