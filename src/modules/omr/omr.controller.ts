import { Controller, Post, Body, Get, Query, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { SaveOmrDto } from './dto/save-omr.dto';
import { OmrService } from './omr.service';


@ApiTags('OMR')
@ApiBearerAuth('access-token')
@Controller('omr')
@UseGuards(JwtAuthGuard)
export class OmrController {
  constructor(private readonly omrService: OmrService) { }

  @Post('save')
  @ApiOperation({ summary: 'Save or submit OMR responses' })
  @ApiResponse({ status: 201, description: 'Responses successfully saved/submitted.' })
  async saveResponse(@Body() payload: SaveOmrDto, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.omrService.saveStudentResponses(payload, userId);
    return {
      status: 'success',
      data: result,
    };
  }

  @Get('students')
  @ApiOperation({ summary: 'Get list of students assigned to the logged-in coordinator/teacher' })
  @ApiResponse({ status: 200, description: 'List of students successfully retrieved.' })
  async getStudents(@Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const roleId = req.user.role || req.user.roleId;
    const data = await this.omrService.getStudentsForCoordinator(userId, roleId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('questions/:studentId')
  @ApiOperation({ summary: 'Get questions applicable to a specific student' })
  @ApiParam({ name: 'studentId', description: 'ID of the student' })
  @ApiResponse({ status: 200, description: 'Questions retrieved.' })
  async getQuestionsForStudent(@Param('studentId') studentId: string) {
    const data = await this.omrService.getQuestionsForStudent(+studentId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('responses/:studentId')
  @ApiOperation({ summary: 'Get existing OMR responses for a student' })
  @ApiParam({ name: 'studentId', description: 'ID of the student' })
  @ApiResponse({ status: 200, description: 'Responses retrieved.' })
  async getResponsesForStudent(@Param('studentId') studentId: string) {
    const data = await this.omrService.getStudentResponses(+studentId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('questions')
  @ApiOperation({ summary: 'Get questions by grade and subject' })
  @ApiQuery({ name: 'grade', description: 'Grade level ID' })
  @ApiQuery({ name: 'subject', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Questions retrieved.' })
  async getQuestions(@Query('grade') grade: string, @Query('subject') subject: string) {
    const questions = await this.omrService.getQuestionsByGradeAndSubject(grade, subject);
    return {
      status: 'success',
      data: questions,
    };
  }
}
