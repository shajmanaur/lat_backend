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

@Entity('assessment_master')
export class AssessmentMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  assessment_id: number;

  @Column({ type: 'varchar', length: 255 })
  assessment_name: string;

  @Column({ type: 'date', nullable: true })
  exam_start_date: Date;

  @Column({ type: 'date', nullable: true })
  exam_end_date: Date;

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
