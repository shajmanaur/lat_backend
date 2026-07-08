import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SubjectMaster } from './subject-master.entity';
import { GradeMaster } from './grade-master.entity';

@Entity('subject_grade_mapping')
export class SubjectGradeMapping {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  subject_id: number;

  @Column({ type: 'int', unsigned: true })
  grade_id: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  updated_at: Date | null;

  @ManyToOne(() => SubjectMaster)
  @JoinColumn({ name: 'subject_id' })
  subject: SubjectMaster;

  @ManyToOne(() => GradeMaster)
  @JoinColumn({ name: 'grade_id' })
  grade: GradeMaster;
}
