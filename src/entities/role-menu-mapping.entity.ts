import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MenuMaster } from './menu-master.entity';
import { UserMaster } from './user-master.entity';

@Entity('role_menu_mapping')
export class RoleMenuMapping {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ unsigned: true })
  role_id: number;

  @Column({ unsigned: true })
  menu_id: number;

  @Column({ type: 'bigint', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: number;

  @ManyToOne(() => MenuMaster)
  @JoinColumn({ name: 'menu_id' })
  menu: MenuMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;
}