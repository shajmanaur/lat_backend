import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiStandardResponses } from '../../common/decorators/swagger-response-example-api-standard.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiStandardResponses(Object)
  async login(@Body() payload: LoginDto) {
    const result = await this.authService.login(payload);
    return {
      status: 'success',
      data: result
    };
  }
}
