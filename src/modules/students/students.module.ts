import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentMaster } from '../../entities/student-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';


@Module({
  imports: [TypeOrmModule.forFeature([StudentMaster, TeacherMaster])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule { }
