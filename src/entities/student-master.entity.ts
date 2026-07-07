import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('student_master')
export class StudentMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  student_id: number;

  @Column({ length: 255 })
  full_name: string;

  @Column({ length: 50, nullable: true })
  apaar_id: string;

  @Column()
  roll_num: number;

  @Column({ type: 'enum', enum: ['nursery','lkg','ukg','i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii'] })
  grade: string;

  @Column({ length: 50 })
  section: string;

  @Column({ length: 20 })
  udise_code: string;

  @Column({ type: 'enum', enum: ['m','f','o'], nullable: true })
  gender: string;

  @Column({ length: 255, nullable: true })
  father_name: string;

  @Column({ length: 255, nullable: true })
  mother_name: string;

  @Column({ length: 20, nullable: true })
  mobile_no: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

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

  @Column({ length: 50, nullable: true, default: '2025' })
  session_start: string;

  @Column({ length: 50, nullable: true, default: '2026' })
  session_end: string;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}