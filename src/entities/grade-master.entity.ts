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

@Entity('grade_master')
export class GradeMaster {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  grade_id: number;

  @Column({
    type: 'enum',
    enum: [
      'nursery',
      'lkg',
      'ukg',
      'i',
      'ii',
      'iii',
      'iv',
      'v',
      'vi',
      'vii',
      'viii',
      'ix',
      'x',
      'xi',
      'xii',
    ],
    unique: true,
  })
  grade_name: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1, nullable: true })
  priority: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number | null;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
    default: null,
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date | null;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}
