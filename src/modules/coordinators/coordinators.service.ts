import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserMaster } from '../../entities/user-master.entity';
import { TeacherMaster } from '../../entities/teacher-master.entity';

import { MailService } from '../mail/mail.service';
import { encrypt } from '../../utils/encryption';

@Injectable()
export class CoordinatorsService {
  constructor(
    @InjectRepository(UserMaster)
    private readonly userRepository: Repository<UserMaster>,
    @InjectRepository(TeacherMaster)
    private readonly teacherRepository: Repository<TeacherMaster>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) { }

  async findAll() {
    const coords = await this.teacherRepository.find({
      relations: ['user', 'region', 'school'],
      where: { user: { role_id: 3 } }, // Explicitly fetch only coordinators
      order: { created_date: 'DESC' },
    });

    return coords.map(c => ({
      id: c.teacher_id,
      name: c.first_name + ' ' + (c.last_name || ''),
      email: c.email_id || c.user?.email,
      mobile: c.mobile_no || c.user?.user_mobile,
      udise: c.udise_code || c.school?.udise_code || '-',
      school: c.school?.school_name || '-',
      region: c.region?.region_name || '-',
      region_id: c.region_id,
      status: c.user?.status === '1' ? 'Active' : 'Inactive',
      imported: c.created_date,
    }));
  }

  async createSingle(payload: any, userId: string | number) {
    const { name, email, mobile, region, school } = payload;

    // Check if user exists
    // Check if user exists with same email or mobile
    let user = await this.userRepository.findOne({
      where: [
        { email: email },
        { user_mobile: mobile }
      ]
    });

    if (user) {
      throw new BadRequestException('Coordinator with this email or mobile already exists');
    }

    let coord;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      user = this.userRepository.create({
        user_name: email,
        email: email,
        user_mobile: mobile,
        password: encrypt(mobile), // encrypted default password
        role_id: 3,
        user_type_id: 3,
        status: '1',
        created_by: +userId,
      });
      await queryRunner.manager.save(user);

      const nameParts = name.split(' ');
      coord = this.teacherRepository.create({
        user_id: user.user_id,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
        email_id: email,
        mobile_no: mobile,
        region_id: +region,
        udise_code: school,
        created_by: +userId,
      });
      await queryRunner.manager.save(coord);

      await queryRunner.commitTransaction();
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to create coordinator');
    } finally {
      await queryRunner.release();
    }

    // Send Welcome Email
    try {
      await this.mailService.sendWelcomeEmail(
        email,
        'COORDINATOR',
        mobile, // Username is mobile
        mobile, // Password is mobile
        'System Admin', // Admin Name
        school // School UDISE
      );
    } catch (e) {
      console.error('Failed to send welcome email to', email, e);
    }

    return coord;
  }

  async createBulk(payload: any, userId: string | number) {
    const { region, school, coordinators } = payload;

    const results = { success: 0, failed: 0, errors: [] };

    for (const c of coordinators) {
      try {
        const name = c.Name || c.name || '';
        const email = c.Email || c.email || '';
        const mobile = String(c.Mobile || c.mobile || '');

        if (!email) {
          results.failed++;
          results.errors.push(`Missing email for ${name}`);
          continue;
        }

        let user = await this.userRepository.findOne({
          where: [
            { email: email },
            { user_mobile: mobile }
          ]
        });

        if (!user) {
          const queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();
          
          try {
            user = this.userRepository.create({
              user_name: email,
              email: email,
              user_mobile: mobile,
              password: encrypt(mobile),
              role_id: 3,
              user_type_id: 3,
              status: '1',
              created_by: +userId,
            });
            await queryRunner.manager.save(user);

            const nameParts = name.split(' ');
            let coord = this.teacherRepository.create({
              user_id: user.user_id,
              first_name: nameParts[0],
              last_name: nameParts.slice(1).join(' '),
              email_id: email,
              mobile_no: mobile,
              region_id: +region,
              udise_code: school,
              created_by: +userId,
            });
            await queryRunner.manager.save(coord);
            
            await queryRunner.commitTransaction();
            results.success++;
          } catch (err: any) {
            await queryRunner.rollbackTransaction();
            results.failed++;
            results.errors.push(`Failed for ${email}: ${err.message}`);
          } finally {
            await queryRunner.release();
          }

          // Send Welcome Email
          try {
            await this.mailService.sendWelcomeEmail(
              email,
              'COORDINATOR',
              mobile, // Username is mobile
              mobile, // Password is mobile
              'System Admin', // Admin Name
              school // School UDISE
            );
          } catch (e) {
            console.error('Failed to send welcome email to', email, e);
          }
        } else {
          results.failed++;
          results.errors.push(`Coordinator ${email} already exists`);
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`Error saving ${c.email}: ${e.message}`);
      }
    }

    return results;
  }

  async updateCoordinator(id: number, payload: any, userId: string | number) {
    const coord = await this.teacherRepository.findOne({ where: { teacher_id: id }, relations: ['user'] });
    if (!coord) throw new BadRequestException('Coordinator not found');

    if (payload.name) {
      const nameParts = payload.name.split(' ');
      coord.first_name = nameParts[0];
      coord.last_name = nameParts.slice(1).join(' ');
    }
    if (payload.email || payload.mobile) {
      const conditions = [];
      if (payload.email) conditions.push({ email: payload.email });
      if (payload.mobile) conditions.push({ user_mobile: payload.mobile });

      if (conditions.length > 0) {
        const existingUser = await this.userRepository.findOne({
          where: conditions
        });

        if (existingUser && coord.user && existingUser.user_id !== coord.user.user_id) {
          throw new BadRequestException('Another coordinator with this email or mobile already exists');
        }
      }
    }

    if (payload.email) {
      coord.email_id = payload.email;
      if (coord.user) {
        coord.user.email = payload.email;
        coord.user.user_name = payload.email;
      }
    }
    if (payload.mobile) {
      coord.mobile_no = payload.mobile;
      if (coord.user) {
        coord.user.user_mobile = payload.mobile;
      }
    }
    if (payload.region) coord.region_id = +payload.region;
    if (payload.school) coord.udise_code = payload.school;

    coord.updated_by = +userId;
    if (coord.user) {
      coord.user.updated_by = +userId;
    }

    await this.teacherRepository.save(coord);
    if (coord.user) {
      await this.userRepository.save(coord.user);
    }
    return coord;
  }

  async toggleStatus(id: number, userId: string | number) {
    const coord = await this.teacherRepository.findOne({ where: { teacher_id: id }, relations: ['user'] });
    if (!coord || !coord.user) throw new BadRequestException('Coordinator or User not found');

    coord.user.status = coord.user.status === '1' ? '0' : '1';
    coord.user.updated_by = +userId;
    await this.userRepository.save(coord.user);
    return { status: coord.user.status === '1' ? 'Active' : 'Inactive' };
  }
}
