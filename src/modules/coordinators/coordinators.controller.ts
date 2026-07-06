import { Controller, Get, Post, Put, Patch, Param, Body, UsePipes, ValidationPipe, UseGuards, Req } from '@nestjs/common';
import { CoordinatorsService } from './coordinators.service';
import { SingleCoordinatorDto, BulkCoordinatorDto, UpdateCoordinatorDto } from './dto/coordinator.dto';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('coordinators')
@UseGuards(JwtAuthGuard)
export class CoordinatorsController {
  constructor(private readonly coordinatorsService: CoordinatorsService) {}

  @Get()
  async findAll() {
    const data = await this.coordinatorsService.findAll();
    return { status: 'success', data };
  }

  @Post('single')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createSingle(@Body() payload: SingleCoordinatorDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.createSingle(payload, userId);
    return { status: 'success', data, message: 'Coordinator added successfully' };
  }

  @Post('bulk')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createBulk(@Body() payload: BulkCoordinatorDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.coordinatorsService.createBulk(payload, userId);
    if (result.failed > 0 && result.success === 0) {
      return { status: false, message: 'Bulk upload failed', error: result.errors };
    }
    return { 
      status: 'success', 
      data: result, 
      message: `Successfully added ${result.success} coordinators. ${result.failed > 0 ? result.failed + ' failed.' : ''}`
    };
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateCoordinator(@Param('id') id: string, @Body() payload: UpdateCoordinatorDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.updateCoordinator(+id, payload, userId);
    return { status: 'success', data, message: 'Coordinator updated successfully' };
  }

  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.toggleStatus(+id, userId);
    return { status: 'success', data, message: `Coordinator marked as ${data.status}` };
  }
}
