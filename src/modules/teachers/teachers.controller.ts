import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiStandardResponses } from '../../common/decorators/swagger-response-example-api-standard.decorator';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Teachers')
@ApiBearerAuth('access-token')
@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of teachers' })
  @ApiStandardResponses(Array)
  async getTeachers(@Request() req: any) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    return this.teachersService.findAll(userId, roleId);
  }

  @Get('meta/grades')
  @ApiOperation({ summary: 'Get available grades for mappings' })
  @ApiStandardResponses(Array)
  async getGrades() {
    const data = await this.teachersService.getGrades();
    return { status: 'success', data };
  }

  @Get('meta/sections')
  @ApiOperation({ summary: 'Get available sections by grade' })
  @ApiStandardResponses(Array)
  async getSections(@Request() req: any, @Query('grade') grade: string) {
    const userId = req.user.sub;
    const data = await this.teachersService.getSections(userId, grade);
    return { status: 'success', data };
  }

  @Get('allocations')
  @ApiOperation({ summary: 'Get teacher allocations' })
  @ApiStandardResponses(Array)
  async getAllocations(@Request() req: any) {
    const userId = req.user.sub;
    const data = await this.teachersService.getAllocations(userId);
    return { status: 'success', data };
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Allocate a teacher to a grade and section' })
  @ApiStandardResponses(Object)
  async allocateTeacher(@Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.allocateTeacher(userId, payload);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiStandardResponses(Object)
  async createTeacher(@Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.createTeacher(payload, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a teacher' })
  @ApiStandardResponses(Object)
  async updateTeacher(@Param('id') id: string, @Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.updateTeacher(+id, payload, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle teacher active/inactive status' })
  @ApiStandardResponses(Object)
  async toggleStatus(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.toggleStatus(+id, userId);
  }
}
