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

  @Get('assessments')
  @ApiOperation({ summary: 'Get all active assessments' })
  @ApiResponse({ status: 200, description: 'Assessments retrieved.' })
  async getAssessments() {
    const data = await this.omrService.getAssessments();
    return {
      status: 'success',
      data,
    };
  }

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

  @Get('entry-status')
  @ApiOperation({ summary: 'Get OMR entry status aggregation' })
  @ApiQuery({ name: 'udise', required: false, description: 'School UDISE Code' })
  @ApiQuery({ name: 'regionId', required: false, description: 'Region ID' })
  @ApiResponse({ status: 200, description: 'Status retrieved.' })
  async getEntryStatus(
    @Query('udise') udise?: string,
    @Query('regionId') regionId?: string
  ) {
    const data = await this.omrService.getEntryStatus(udise, regionId);
    return {
      status: 'success',
      data,
    };
  }

  @Get('evaluation-status')
  @ApiOperation({ summary: 'Get OMR evaluation status' })
  @ApiQuery({ name: 'udise', required: false, description: 'School UDISE Code' })
  @ApiQuery({ name: 'regionId', required: false, description: 'Region ID' })
  @ApiQuery({ name: 'gradeId', required: false, description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Evaluation status retrieved.' })
  async getEvaluationStatus(
    @Query('udise') udise?: string,
    @Query('regionId') regionId?: string,
    @Query('gradeId') gradeId?: string
  ) {
    const data = await this.omrService.getEvaluationStatus({ udise, regionId, gradeId });
    return {
      status: 'success',
      data,
    };
  }

  @Post('evaluate/:udise')
  @ApiOperation({ summary: 'Run evaluation for a specific school' })
  @ApiParam({ name: 'udise', description: 'School UDISE Code' })
  @ApiResponse({ status: 200, description: 'Evaluation completed.' })
  async runEvaluation(@Param('udise') udise: string) {
    const data = await this.omrService.runEvaluation(udise);
    return {
      status: 'success',
      data,
    };
  }
}
