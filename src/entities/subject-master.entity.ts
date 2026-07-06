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

@Entity('subject_master')
export class SubjectMaster {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  subject_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  subject_name: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1, nullable: true })
  priority: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number | null;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  updated_at: Date | null;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}
