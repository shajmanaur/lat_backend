import { Controller, Get, Post, Body, Req, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { OmrService } from './omr.service';

@ApiTags('Teacher OMR Dashboard')
@ApiBearerAuth('access-token')
@Controller('omr/teacher')
@UseGuards(JwtAuthGuard)
export class TeacherOmrController {
  constructor(private readonly omrService: OmrService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get summary counts for teacher OMR dashboard' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully.' })
  async getSummary(@Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.omrService.getTeacherOmrSummary(userId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('grades')
  @ApiOperation({ summary: 'Get grade list for teacher OMR dashboard' })
  @ApiResponse({ status: 200, description: 'Grades retrieved successfully.' })
  async getGrades(@Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.omrService.getTeacherOmrGrades(userId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('grades/:gradeId/students')
  @ApiOperation({ summary: 'Get students for a specific grade on teacher OMR dashboard' })
  @ApiParam({ name: 'gradeId', description: 'ID of the grade' })
  @ApiQuery({ name: 'section', required: false, description: 'Filter by section' })
  @ApiQuery({ name: 'search', required: false, description: 'Search students by name or roll number' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully.' })
  async getStudents(
    @Param('gradeId') gradeId: string,
    @Req() req: any,
    @Query('section') section?: string,
    @Query('search') search?: string
  ) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.omrService.getTeacherOmrStudents(userId, +gradeId, section, search);
    return {
      status: 'success',
      data,
    };
  }

  @Post('grades/:gradeId/submit')
  @ApiOperation({ summary: 'Bulk submit draft OMR responses for a grade' })
  @ApiParam({ name: 'gradeId', description: 'ID of the grade' })
  @ApiResponse({ status: 200, description: 'Drafts successfully finalized.' })
  async submitGradeOmr(
    @Param('gradeId') gradeId: string,
    @Req() req: any,
    @Body('section') section?: string
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.omrService.submitTeacherGradeOmr(userId, +gradeId, section);
    return {
      status: 'success',
      data: result,
    };
  }
}
