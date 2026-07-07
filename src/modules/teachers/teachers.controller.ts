import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async getTeachers(@Request() req: any) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    return this.teachersService.findAll(userId, roleId);
  }

  @Get('meta/grades')
  async getGrades() {
    const data = await this.teachersService.getGrades();
    return { status: 'success', data };
  }

  @Get('meta/sections')
  async getSections(@Request() req: any, @Query('grade') grade: string) {
    const userId = req.user.sub;
    const data = await this.teachersService.getSections(userId, grade);
    return { status: 'success', data };
  }

  @Get('allocations')
  async getAllocations(@Request() req: any) {
    const userId = req.user.sub;
    const data = await this.teachersService.getAllocations(userId);
    return { status: 'success', data };
  }

  @Post('allocations')
  async allocateTeacher(@Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.allocateTeacher(userId, payload);
  }

  @Post()
  async createTeacher(@Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.createTeacher(payload, userId);
  }

  @Put(':id')
  async updateTeacher(@Param('id') id: string, @Body() payload: any, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.updateTeacher(+id, payload, userId);
  }

  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.teachersService.toggleStatus(+id, userId);
  }
}
