import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserMaster } from './user-master.entity';
import { GradeMaster } from './grade-master.entity';
import { SubjectMaster } from './subject-master.entity';

@Entity('omr_question_master')
export class OmrQuestionMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  grade_id: number;

  @Column({ type: 'int', unsigned: true })
  subject_id: number;

  @ManyToOne(() => GradeMaster)
  @JoinColumn({ name: 'grade_id' })
  grade: GradeMaster;

  @ManyToOne(() => SubjectMaster)
  @JoinColumn({ name: 'subject_id' })
  subject: SubjectMaster;

  @Column({ type: 'int' })
  item_number: number;

  @Column({ type: 'varchar', length: 255 })
  ncf_competency: string;

  @Column({ type: 'varchar', length: 50 })
  competency_code: string;

  @Column({ type: 'char', length: 1, comment: 'A, B, C, or D' })
  correct_option: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}
