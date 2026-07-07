import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';

import { TeacherMaster } from '../../entities/teacher-master.entity';
import { UserMaster } from '../../entities/user-master.entity';
import { TeacherGradeSectionMapping } from '../../entities/teacher-grade-section-mapping.entity';
import { GradeMaster } from '../../entities/grade-master.entity';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherMaster,
      UserMaster,
      TeacherGradeSectionMapping,
      GradeMaster,
      StudentMaster,
    ]),
    MailModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule { }
