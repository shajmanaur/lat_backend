import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { RegionMaster } from './region-master.entity';

@Entity('school_master')
export class SchoolMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  school_id: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  udise_code: string;

  @Column({ type: 'varchar', length: 255 })
  school_name: string;

  @Column({ type: 'int', unsigned: true })
  region_id: number;

  @ManyToOne(() => RegionMaster)
  @JoinColumn({ name: 'region_id' })
  region: RegionMaster;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
    default: null,
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date | null;
}
