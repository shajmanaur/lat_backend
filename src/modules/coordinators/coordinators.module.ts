import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMaster } from '../../entities/user-master.entity';
import { CoordinatorsService } from './coordinators.service';
import { CoordinatorsController } from './coordinators.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserMaster])], // Coordinators are users
  controllers: [CoordinatorsController],
  providers: [CoordinatorsService],
  exports: [CoordinatorsService],
})
export class CoordinatorsModule {}
