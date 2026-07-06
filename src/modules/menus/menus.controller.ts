import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Menus')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get('my-menus')
  @ApiOperation({ summary: 'Get sidebar menus for the logged in user' })
  async getMyMenus(@Request() req) {
    // req.user is injected by JwtAuthGuard
    // It contains the decoded JWT payload { sub, username, roleId }
    const roleId = req.user.roleId || req.user.role;
    const menus = await this.menusService.getMyMenus(roleId);
    
    return {
      status: 'success',
      data: menus,
    };
  }
}
