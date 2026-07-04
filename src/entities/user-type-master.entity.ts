import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('user_type_master')
export class UserTypeMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  user_type_id: number;

  @Column({ length: 50, unique: true })
  user_type_name: string;

  @Column({ default: 1, unsigned: true })
  priority: number;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}