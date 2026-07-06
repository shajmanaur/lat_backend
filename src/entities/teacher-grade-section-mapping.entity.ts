import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('teacher_grade_section_mappings')
@Index('uq_school_grade_section', ['udise_code', 'grade', 'section'], { unique: true })
@Index('idx_teacher_id', ['teacher_id'])
@Index('idx_udise_code', ['udise_code'])
export class TeacherGradeSectionMapping {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  udise_code: string;

  @Column({ type: 'varchar', length: 50 })
  grade: string;

  @Column({ type: 'varchar', length: 10 })
  section: string;

  @Column({ type: 'bigint', unsigned: true })
  teacher_id: string;

  @Column({ type: 'bigint', unsigned: true })
  created_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  updated_at: Date | null;
}
