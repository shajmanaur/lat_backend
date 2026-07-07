import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics overview' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getStats(@Request() req: any) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    return this.dashboardService.getOverviewStats(userId, roleId);
  }
}
