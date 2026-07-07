import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { StudentMaster } from './student-master.entity';
import { UserMaster } from './user-master.entity';
import { OmrQuestionMaster } from './omr-question-master.entity';

@Entity('omr_student_response')
@Unique('UK_omr_student_question', ['student_id', 'question_id'])
export class OmrStudentResponse {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  student_id: number;

  @Column({ type: 'bigint', unsigned: true })
  question_id: number;

  @Column({ type: 'char', length: 1, nullable: true, comment: 'A, B, C, D, or NULL' })
  selected_option: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_correct: number;

  @Column({ type: 'tinyint', default: 0, comment: '0: Draft, 1: Submitted' })
  status: number;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => StudentMaster)
  @JoinColumn({ name: 'student_id' })
  student: StudentMaster;

  @ManyToOne(() => OmrQuestionMaster)
  @JoinColumn({ name: 'question_id' })
  question: OmrQuestionMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}
