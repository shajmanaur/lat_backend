import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('regions')
@UseGuards(JwtAuthGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  async findAll() {
    const data = await this.regionsService.findAll();
    return {
      status: 'success',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.regionsService.findOne(+id);
    return {
      status: 'success',
      data,
    };
  }
}
