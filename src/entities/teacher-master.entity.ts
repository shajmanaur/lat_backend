import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';
import { RegionMaster } from './region-master.entity';
import { SchoolMaster } from './school-master.entity';

@Entity('teacher_master')
export class TeacherMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  teacher_id: number;

  @Column({ type: 'bigint', unsigned: true, unique: true })
  user_id: number;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 100, nullable: true })
  designation: string;

  @Column({ type: 'enum', enum: ['m','f','o'], default: 'o' })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string;

  @Column({ length: 20, nullable: true })
  udise_code: string;

  @Column({ length: 50, nullable: true, default: 'India' })
  country: string;

  @Column({ unsigned: true, nullable: true })
  region_id: number;

  @Column({ length: 50, nullable: true })
  state: string;

  @Column({ length: 50, nullable: true })
  district: string;

  @Column({ length: 50, nullable: true })
  block: string;

  @Column({ length: 10, nullable: true })
  zip_code: string;

  @Column({ length: 255, nullable: true })
  mobile_no: string;

  @Column({ length: 255, nullable: true })
  email_id: string;

  @Column({ length: 100, nullable: true })
  qualification: string;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ length: 12, nullable: true })
  aadhar_no: string;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_date: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updated_date: Date;

  @Column({ length: 50, nullable: true, default: '2025' })
  session_start: string;

  @Column({ length: 50, nullable: true, default: '2026' })
  session_end: string;

  @Column({ nullable: true, default: 1 })
  school_type_id: number;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user: UserMaster;

  @ManyToOne(() => RegionMaster)
  @JoinColumn({ name: 'region_id' })
  region: RegionMaster;

  @ManyToOne(() => SchoolMaster)
  @JoinColumn({ name: 'udise_code', referencedColumnName: 'udise_code' })
  school: SchoolMaster;
}