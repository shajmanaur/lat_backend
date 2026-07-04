import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    const data = await this.dashboardService.getOverviewStats();
    return {
      status: 'success',
      data,
    };
  }
}
