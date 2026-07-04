import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserTypeMaster } from './user-type-master.entity';

@Entity('user_master')
export class UserMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ length: 50, unique: true, nullable: true })
  user_name: string;

  @Column({ length: 255, nullable: true })
  password: string;

  @Column({ length: 255, nullable: true })
  user_mobile: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ unsigned: true, nullable: true })
  user_type_id: number;

  @Column({ unsigned: true, nullable: true })
  role_id: number;

  @Column({ unsigned: true, nullable: true })
  user_prefered_language_id: number;

  @Column({ type: 'enum', enum: ['0','1','2','3','4'], default: '1' })
  status: string;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ length: 255, nullable: true })
  remember_token: string;

  @ManyToOne(() => UserTypeMaster)
  @JoinColumn({ name: 'user_type_id' })
  userType: UserTypeMaster;
}