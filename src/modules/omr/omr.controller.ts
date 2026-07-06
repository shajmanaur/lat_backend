import { Controller, Post, Body, Get, Query, UseGuards, Req } from '@nestjs/common';
import { OmrService } from './omr.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('omr')
@UseGuards(JwtAuthGuard)
export class OmrController {
  constructor(private readonly omrService: OmrService) {}

  @Post('save')
  async saveResponse(@Body() payload: any, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.omrService.saveStudentResponses(payload, userId);
    return {
      status: 'success',
      data: result,
    };
  }

  @Get('questions')
  async getQuestions(@Query('grade') grade: string, @Query('subject') subject: string) {
    const questions = await this.omrService.getQuestionsByGradeAndSubject(grade, subject);
    return {
      status: 'success',
      data: questions,
    };
  }
}
