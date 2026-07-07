import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'The username or email' })
  @IsNotEmpty()
  @IsString()
  user_name: string;

  @ApiProperty({ example: 'password123', description: 'The user password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
