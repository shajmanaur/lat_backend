import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('region_master')
export class RegionMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  region_id: number;

  @Column({ length: 50, unique: true })
  region_name: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1, nullable: true })
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

  @Column({ length: 250, nullable: true })
  founders: string;

  @Column({ length: 250, nullable: true })
  founders_logo: string;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}