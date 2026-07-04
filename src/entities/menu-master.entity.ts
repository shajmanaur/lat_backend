import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('menu_master')
export class MenuMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 50 })
  menu_name: string;

  @Column({ length: 255 })
  menu_link: string;

  @Column({ length: 255, nullable: true })
  menu_icon: string;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ type: 'boolean', nullable: true })
  is_home_menu: boolean;

  @Column({ type: 'text', nullable: true })
  menu_remarks: string;

  @Column({ default: 1 })
  is_parent: number;

  @Column({ default: 1 })
  priority: number;

  @Column({ nullable: true, default: 0 })
  sub_menu: number;

  @Column({ type: 'enum', enum: ['T', 'S'], default: 'S' })
  menu_type: string;

  @Column({ type: 'bigint' })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'bigint', nullable: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;
}