import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OmrController } from './omr.controller';
import { OmrService } from './omr.service';
import { OmrQuestionMaster } from '../../entities/omr-question-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { SubjectMaster } from '../../entities/subject-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OmrQuestionMaster, OmrStudentResponse, SubjectMaster])],
  controllers: [OmrController],
  providers: [OmrService],
  exports: [OmrService],
})
export class OmrModule {}
