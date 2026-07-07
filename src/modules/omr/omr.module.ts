import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OmrController } from './omr.controller';
import { OmrService } from './omr.service';
import { OmrUploadController } from './omr-upload.controller';
import { OmrUploadService } from './omr-upload.service';
import { OmrQuestionMaster } from '../../entities/omr-question-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';
import { SubjectMaster } from '../../entities/subject-master.entity';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { GradeMaster } from '../../entities/grade-master.entity';
import { TeacherGradeSectionMapping } from '../../entities/teacher-grade-section-mapping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OmrQuestionMaster, OmrStudentResponse, SubjectMaster, StudentMaster, TeacherMaster, GradeMaster, TeacherGradeSectionMapping])],
  controllers: [OmrController, OmrUploadController],
  providers: [OmrService, OmrUploadService],
  exports: [OmrService],
})
export class OmrModule {}
