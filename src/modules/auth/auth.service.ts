import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMaster } from '../../entities/user-master.entity';
import { JwtService } from '@nestjs/jwt';
import { encrypt } from '../../utils/encryption';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserMaster)
    private readonly userRepo: Repository<UserMaster>,
    private readonly jwtService: JwtService
  ) {}

  async login(payload: any) {
    const { username, password } = payload;
    
    // Encrypt the incoming password to match what's in the DB
    const encryptedPassword = encrypt(password);
    
    const user = await this.userRepo.findOne({
      where: { user_name: username, password: encryptedPassword, status: '1' }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtPayload = { sub: user.user_id, username: user.user_name, role: user.user_type_id };
    
    return {
      access_token: await this.jwtService.signAsync(jwtPayload),
      user: {
        id: user.user_id,
        username: user.user_name,
        roleId: user.user_type_id,
      }
    };
  }
}
