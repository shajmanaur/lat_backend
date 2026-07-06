import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Schools')
@Controller('schools')
@UseGuards(JwtAuthGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('region/:regionId')
  @ApiOperation({ summary: 'Get schools by region ID' })
  async getByRegion(@Param('regionId') regionId: string) {
    const data = await this.schoolsService.getSchoolsByRegion(+regionId);
    return {
      status: 'success',
      data,
    };
  }
}
