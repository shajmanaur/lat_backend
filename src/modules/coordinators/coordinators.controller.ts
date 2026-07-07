import { Controller, Get, Post, Put, Patch, Param, Body, UsePipes, ValidationPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiStandardResponses } from '../../common/decorators/swagger-response-example-api-standard.decorator';
import { CoordinatorsService } from './coordinators.service';
import { SingleCoordinatorDto, BulkCoordinatorDto, UpdateCoordinatorDto } from './dto/coordinator.dto';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Coordinators')
@ApiBearerAuth('access-token')
@Controller('coordinators')
@UseGuards(JwtAuthGuard)
export class CoordinatorsController {
  constructor(private readonly coordinatorsService: CoordinatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all coordinators' })
  @ApiStandardResponses(Array)
  async findAll() {
    const data = await this.coordinatorsService.findAll();
    return { status: 'success', data };
  }

  @Post('single')
  @ApiOperation({ summary: 'Create a single coordinator' })
  @ApiStandardResponses(Object)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createSingle(@Body() payload: SingleCoordinatorDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.createSingle(payload, userId);
    return { status: 'success', data, message: 'Coordinator added successfully' };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Upload coordinators in bulk' })
  @ApiStandardResponses(Object)
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
  @ApiOperation({ summary: 'Update a coordinator' })
  @ApiStandardResponses(Object)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateCoordinator(@Param('id') id: string, @Body() payload: UpdateCoordinatorDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.updateCoordinator(+id, payload, userId);
    return { status: 'success', data, message: 'Coordinator updated successfully' };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle coordinator active/inactive status' })
  @ApiStandardResponses(Object)
  async toggleStatus(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.coordinatorsService.toggleStatus(+id, userId);
    return { status: 'success', data, message: `Coordinator marked as ${data.status}` };
  }
}
