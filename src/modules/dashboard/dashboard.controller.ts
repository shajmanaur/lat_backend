import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    return this.dashboardService.getOverviewStats(userId, roleId);
  }
}
