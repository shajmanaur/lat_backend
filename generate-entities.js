const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'entities');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = {
  'user-type-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('user_type_master')
export class UserTypeMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  user_type_id: number;

  @Column({ length: 50, unique: true })
  user_type_name: string;

  @Column({ default: 1, unsigned: true })
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

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserMaster;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: UserMaster;
}`,

  'user-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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
}`,

  'role-menu-mapping.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column({ type: 'bit', default: 1 })
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
}`,

  'menu-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'bit', default: 1 })
  status: boolean;

  @Column({ type: 'bit', nullable: true })
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
}`,

  'region-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('region_master')
export class RegionMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  region_id: number;

  @Column({ length: 50, unique: true })
  region_name: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1, nullable: true })
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
}`,

  'student-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

@Entity('student_master')
export class StudentMaster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  student_id: number;

  @Column({ length: 255 })
  full_name: string;

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
}`,

  'teacher-master.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserMaster } from './user-master.entity';

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

  @Column({ length: 255, nullable: true })
  school_name: string;

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

  @Column({ type: 'bit', default: 1 })
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
}`
};

Object.entries(files).forEach(([filename, content]) => {
  fs.writeFileSync(path.join(dir, filename), content);
});

console.log('Entities created successfully.');
