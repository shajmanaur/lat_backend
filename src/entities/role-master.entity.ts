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
import { UserMaster } from './user-master.entity';
import { UserTypeMaster } from './user-type-master.entity';

@Entity('role_master')
@Unique('role_name_user_type_id', ['role_name', 'user_type_id'])
export class RoleMaster {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  role_id: number;

  @Column({ type: 'varchar', length: 50 })
  role_name: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  user_type_id: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  priority: number;

  @Column({ type: 'bit', default: 1 })
  status: boolean;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => UserTypeMaster)
  @JoinColumn({ name: 'user_type_id' })
  user_type: UserTypeMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}
