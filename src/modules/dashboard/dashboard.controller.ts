import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get overview statistics for the dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getStats(
    @Request() req: any,
    @Query('regionId') regionId?: string,
    @Query('udise') udise?: string,
    @Query('gradeId') gradeId?: string,
    @Query('section') section?: string
  ) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    return this.dashboardService.getOverviewStats(userId, roleId, {
      regionId: regionId ? +regionId : undefined,
      udise,
      gradeId: gradeId ? +gradeId : undefined,
      section
    });
  }
}
